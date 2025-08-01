// src/scripts/main.ts - Final Definitive Version

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- TYPE DEFINITIONS ---
type Theme = 'light' | 'dark';
type EnergyLevel = 'high' | 'medium' | 'low' | null;
type DayDataCategory = 'fitness' | 'nutrition' | 'hydration' | 'selfCare' | 'wellness' | 'digestiveHealth';

export interface DayData {
    day: number;
    date: string;
    fitness: { workout: boolean; pushups: number; creatine: boolean; };
    nutrition: { breakfast: boolean; lunch: boolean; dinner: boolean; snack: boolean; };
    hydration: { intake: number; };
    selfCare: { skinAM: boolean; skinPM: boolean; prayerAM: boolean; prayerPM: boolean; };
    wellness: { sleep: number; es: boolean; energy: EnergyLevel; };
    digestiveHealth: { bloating: boolean; constipation: boolean; acidPain: boolean; };
}

// --- MAIN APPLICATION CLASS ---
class AstroTrackerApp {
    private trackerData: DayData[] = [];
    private isDirty = false;
    private isSaving = false;
    private isExporting = false;
    private readonly TOTAL_DAYS = 30;
    private readonly WATER_GOAL = 2.5;
    private readonly SLEEP_GOAL = 8;

    constructor() {
        this.initializeApp();
    }
    
    private initializeApp() {
        this.attachEventListeners();
        this.loadData();
        this.updateAllUI();
        this.initTelegram();
    }

    private loadData() {
        const savedData = localStorage.getItem('AstroTrackerData');
        if (savedData) {
            this.trackerData = JSON.parse(savedData);
            this.showNotification('Loaded local progress.', 'info');
        } else {
            this.trackerData = Array.from({ length: this.TOTAL_DAYS }, (_, i) => this.createDefaultDay(i + 1));
            this.showNotification('Welcome! Start your new journey.', 'info');
        }
        this.syncUIToData();
    }
    
    private syncUIToData() {
        this.trackerData.forEach(dayData => {
            const dayCard = document.querySelector(`.day-card[data-day="${dayData.day}"]`);
            if (!dayCard) return;

            (dayCard.querySelector('[data-input="date"]') as HTMLInputElement).value = dayData.date;
            (dayCard.querySelector('[data-input="fitness.pushups"]') as HTMLInputElement).value = dayData.fitness.pushups.toString();
            (dayCard.querySelector('[data-input="wellness.sleep"]') as HTMLInputElement).value = dayData.wellness.sleep.toString();
            (dayCard.querySelector('[data-input="hydration.intake"]') as HTMLInputElement).value = dayData.hydration.intake.toString();
            
            const waterText = dayCard.querySelector('.water-text');
            if(waterText) waterText.textContent = `${dayData.hydration.intake.toFixed(1)}/2.5L`;

            dayCard.querySelectorAll('.checkbox-container[data-input]').forEach(el => {
                const inputPath = (el as HTMLElement).dataset.input!;
                const [category, key] = inputPath.split('.') as [DayDataCategory, string];
                const value = (dayData[category] as any)[key];
                el.querySelector('.custom-checkbox')?.classList.toggle('checked', !!value);
            });
            
            dayCard.querySelectorAll('.tag-option[data-input]').forEach(el => {
                 const inputPath = (el as HTMLElement).dataset.input!;
                 const [category, key] = inputPath.split('.') as [DayDataCategory, string];
                 const value = (dayData[category] as any)[key];
                 el.classList.toggle('selected', !!value);
            });

            dayCard.querySelectorAll('.emoji-option[data-value]').forEach(el => {
                 const value = (el as HTMLElement).dataset.value;
                 el.classList.toggle('selected', value === dayData.wellness.energy);
            });
        });
    }

    private initTelegram() {
        if (window.Telegram) {
            try {
                const tg = window.Telegram.WebApp;
                tg.ready();
                tg.onEvent('themeChanged', () => this.handleThemeChangeFromTelegram());
            } catch (e) { console.error("Error initializing Telegram App:", e); }
        }
    }
    
    private applyTheme(theme: Theme) {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
    }
    private toggleTheme() {
        const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        localStorage.setItem('AstroTrackerTheme', newTheme);
    }
    private handleThemeChangeFromTelegram() {
        if (window.Telegram) {
            try { this.applyTheme(window.Telegram.WebApp.colorScheme); } catch(e) {}
        }
    }

    private createDefaultDay(day: number): DayData {
        const date = new Date(); date.setDate(date.getDate() + day - 1);
        return {
            day, date: date.toISOString().split('T')[0],
            fitness: { workout: false, pushups: 0, creatine: false },
            nutrition: { breakfast: false, lunch: false, dinner: false, snack: false },
            hydration: { intake: 0 },
            selfCare: { skinAM: false, skinPM: false, prayerAM: false, prayerPM: false },
            wellness: { sleep: 7, es: false, energy: null },
            digestiveHealth: { bloating: false, constipation: false, acidPain: false }
        };
    }

    private saveData() {
        if (!this.isDirty) {
            this.showNotification('No unsaved changes.', 'info');
            return;
        }
        localStorage.setItem('AstroTrackerData', JSON.stringify(this.trackerData));
        this.isDirty = false;
        this.updateSaveButtonState();
        this.showNotification('Progress saved!', 'success');
    }
    
    private async exportToPDF() {
        if (this.isExporting) return;
        this.isExporting = true;
        this.showNotification('Generating your report...', 'info');

        const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
        if(exportBtn) exportBtn.disabled = true;

        try {
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text("AstroTracker: 30-Day Transformation Report", 14, 22);
            const tableData = this.trackerData.map(day => [
                day.day, day.date, day.fitness.workout ? '✅' : '—', day.fitness.pushups,
                day.hydration.intake.toFixed(1), day.wellness.sleep.toFixed(1),
                Object.values(day.digestiveHealth).filter(Boolean).length ? 'Yes' : 'No'
            ]);
            autoTable(doc, {
                startY: 35, head: [['Day', 'Date', 'Workout', 'Push-ups', 'Water (L)', 'Sleep (h)', 'Symptoms']],
                body: tableData, theme: 'grid', headStyles: { fillColor: [44, 62, 80] }
            });

            if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
                const userId = window.Telegram.WebApp.initDataUnsafe.user.id.toString();
                const pdfBase64 = doc.output('datauristring').split(',')[1];
                
                this.showNotification('Sending to your chat...', 'info');
                const response = await fetch('/api/send-pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pdfBase64, userId }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to send to Telegram.');
                }
                
                this.showNotification('Report sent to your chat!', 'success');
                window.Telegram.WebApp.close();
            } else {
                this.showNotification('Downloading PDF directly.', 'success');
                doc.save('AstroTracker-Report.pdf');
            }
        } catch (error) {
            const errorMessage = this.getErrorMessage(error);
            console.error("Export failed:", errorMessage);
            this.showNotification(errorMessage, 'error');
        } finally {
            this.isExporting = false;
            if(exportBtn) exportBtn.disabled = false;
        }
    }
    
    private resetData() {
        if (confirm('Are you sure you want to reset all data?')) {
            this.trackerData = Array.from({ length: this.TOTAL_DAYS }, (_, i) => this.createDefaultDay(i + 1));
            this.isDirty = true;
            this.saveData();
            this.syncUIToData();
            this.updateAllUI();
        }
    }
    
    private setDirty() { 
        if (!this.isDirty) { this.isDirty = true; this.updateSaveButtonState(); } 
    }
    private updateAllUI() { 
        this.updateProgressCalendar(); 
        this.calculateProgress(); 
        this.updateSaveButtonState();
    }
    private updateSaveButtonState() { 
        const btn = document.getElementById('fixedSaveBtn'); 
        if (btn) btn.classList.toggle('dirty', this.isDirty); 
    }
    private setDirtyAndUpdate() { 
        this.setDirty(); 
        this.updateProgressCalendar(); 
        this.calculateProgress(); 
    }
    private updateProgressCalendar() { 
        this.trackerData.forEach(d => document.querySelector(`[data-calendar-day="${d.day}"]`)?.classList.toggle('completed', d.fitness.workout)); 
    }
    
    private attachEventListeners() {
        document.getElementById('fixedSaveBtn')?.addEventListener('click', () => this.saveData());
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportToPDF());
        document.getElementById('resetBtn')?.addEventListener('click', () => this.resetData());
        document.getElementById('themeToggleBtn')?.addEventListener('click', () => this.toggleTheme());
        
        const trackerContainer = document.getElementById('trackerContainer');
        if (!trackerContainer) return;

        trackerContainer.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const header = target.closest('.day-header');
            if (header) {
                header.closest('.day-card')?.classList.toggle('collapsed');
                return;
            }
            
            const dayCard = target.closest('.day-card') as HTMLElement;
            if (!dayCard) return;

            const day = parseInt(dayCard.dataset.day!, 10);
            const data = this.trackerData[day - 1];
            const checkboxContainer = target.closest('.checkbox-container') as HTMLElement;

            if (checkboxContainer?.dataset.input) {
                const [category, key] = checkboxContainer.dataset.input.split('.') as [DayDataCategory, string];
                const dataCategoryObject = data[category];
                (dataCategoryObject as any)[key] = !(dataCategoryObject as any)[key];
                checkboxContainer.querySelector('.custom-checkbox')?.classList.toggle('checked');
                this.setDirtyAndUpdate();
                return;
            }

            const tagOption = target.closest('.tag-option') as HTMLElement;
            if (tagOption?.dataset.input) {
                const [category, key] = tagOption.dataset.input.split('.') as [DayDataCategory, string];
                const dataCategoryObject = data[category];
                (dataCategoryObject as any)[key] = !(dataCategoryObject as any)[key];
                tagOption.classList.toggle('selected');
                this.setDirtyAndUpdate();
                return;
            }

            const emojiOption = target.closest('.emoji-option') as HTMLElement;
            if (emojiOption) {
                const group = emojiOption.parentElement! as HTMLElement;
                const [category, key] = group.dataset.inputGroup!.split('.') as [DayDataCategory, string];
                const value = emojiOption.dataset.value as EnergyLevel;
                (data[category] as any)[key] = value;
                group.querySelectorAll('.emoji-option').forEach(el => el.classList.remove('selected'));
                emojiOption.classList.add('selected');
                this.setDirtyAndUpdate();
                return;
            }
        });

        trackerContainer.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            const dayCard = target.closest('.day-card') as HTMLElement;
            if (!dayCard) return;

            const day = parseInt(dayCard.dataset.day!, 10);
            const data = this.trackerData[day - 1];
            const inputPath = target.dataset.input!;
            const [category, key] = inputPath.split('.') as [DayDataCategory, string];

            if (target.type === 'number' || target.type === 'range') {
                (data[category] as any)[key] = parseFloat(target.value) || 0;
            } else if (target.type === 'date') {
                 data.date = target.value;
            }

            if (inputPath === 'hydration.intake') {
                 const waterText = dayCard.querySelector('.water-text');
                 if(waterText) waterText.textContent = `${target.value}/2.5L`;
            }
            
            this.setDirtyAndUpdate();
        });
    }

    private calculateProgress() {
        if (!this.trackerData || this.trackerData.length === 0) return;
        const workoutDays = this.trackerData.filter(d => d.fitness.workout).length;
        const workoutPercent = Math.round((workoutDays / this.TOTAL_DAYS) * 100);
        this.updateProgressUI('workout', `${workoutPercent}%`, workoutPercent);

        const totalWater = this.trackerData.reduce((sum, d) => sum + d.hydration.intake, 0);
        const avgWaterPercent = Math.round(((totalWater / this.TOTAL_DAYS) / this.WATER_GOAL) * 100);
        this.updateProgressUI('water', `${avgWaterPercent}%`, avgWaterPercent);

        const daysWithSleepData = this.trackerData.filter(d => d.wellness.sleep > 0).length || 1;
        const totalSleep = this.trackerData.reduce((sum, d) => sum + d.wellness.sleep, 0);
        const avgSleep = totalSleep / daysWithSleepData;
        const sleepPercent = Math.min(100, Math.round((avgSleep / this.SLEEP_GOAL) * 100));
        this.updateProgressUI('sleep', `${avgSleep.toFixed(1)}h`, sleepPercent);
        
        const wellnessScore = this.trackerData.reduce((total, day) => {
            let score = 0;
            if (day.fitness.workout) score++;
            if (day.hydration.intake >= this.WATER_GOAL) score++;
            if (day.wellness.sleep >= 7 && day.wellness.sleep <= 9) score++;
            if (day.selfCare.skinAM && day.selfCare.skinPM) score++;
            const meals = Object.values(day.nutrition).filter(Boolean).length;
            if (meals >= 3) score++;
            return total + (score / 5);
        }, 0);
        const wellnessPercent = Math.round((wellnessScore / this.TOTAL_DAYS) * 100);
        this.updateProgressUI('wellness', `${wellnessPercent}%`, wellnessPercent);
    }
    
    private updateProgressUI(metric: string, value: string, barPercent: number) {
        const valueEl = document.getElementById(`${metric}Progress`);
        const barEl = document.getElementById(`${metric}Bar`) as HTMLElement;
        if(valueEl) valueEl.textContent = value;
        if(barEl) barEl.style.width = `${Math.min(barPercent, 100)}%`;
    }
    
    private showNotification(message: string, type: 'success' | 'error' | 'info') {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: -50px;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            padding: 12px 25px;
            border-radius: 50px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 1001;
            font-weight: 600;
            opacity: 0;
            transition: opacity 0.3s, bottom 0.3s;
        `;
        if(type === 'success') notification.style.backgroundColor = '#2ecc71';
        if(type === 'error') notification.style.backgroundColor = '#e74c3c';
        if(type === 'info') notification.style.backgroundColor = '#3498db';

        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.bottom = '30px';
        }, 10);
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.bottom = '-50px';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    private getErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }
        return String(error);
    }
}

new AstroTrackerApp();