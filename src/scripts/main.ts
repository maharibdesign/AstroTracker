// src/scripts/main.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- TYPE DEFINITIONS ---
type EnergyLevel = 'high' | 'medium' | 'low' | null;

export interface DayData {
    day: number;
    date: string;
    fitness: {
        workout: boolean;
        pushups: number;
        creatine: boolean;
    };
    nutrition: {
        breakfast: boolean;
        lunch: boolean;
        dinner: boolean;
        snack: boolean;
    };
    hydration: {
        intake: number;
    };
    selfCare: {
        skinAM: boolean;
        skinPM: boolean;
        prayerAM: boolean;
        prayerPM: boolean;
    };
    wellness: {
        sleep: number;
        es: boolean;
        energy: EnergyLevel;
    };
    digestiveHealth: {
        bloating: boolean;
        constipation: boolean;
        acidPain: boolean;
    };
}

// --- MAIN APPLICATION CLASS ---
class AstroTrackerApp {
    private trackerData: DayData[] = [];
    private isDirty = false; // To track unsaved changes
    private readonly TOTAL_DAYS = 30;
    private readonly WATER_GOAL = 2.5;
    private readonly SLEEP_GOAL = 8;

    constructor() {
        this.loadData();
        this.attachEventListeners();
        this.updateAllUI();
        console.log("AstroTracker App Initialized");
    }

    private createDefaultDay(day: number): DayData {
        const date = new Date();
        date.setDate(date.getDate() + day - 1);
        return {
            day: day,
            date: date.toISOString().split('T')[0],
            fitness: { workout: false, pushups: 0, creatine: false },
            nutrition: { breakfast: false, lunch: false, dinner: false, snack: false },
            hydration: { intake: 0 },
            selfCare: { skinAM: false, skinPM: false, prayerAM: false, prayerPM: false },
            wellness: { sleep: 7, es: false, energy: null },
            digestiveHealth: { bloating: false, constipation: false, acidPain: false }
        };
    }

    private loadData() {
        const savedData = localStorage.getItem('AstroTrackerData');
        if (savedData) {
            this.trackerData = JSON.parse(savedData);
        } else {
            this.trackerData = Array.from({ length: this.TOTAL_DAYS }, (_, i) => this.createDefaultDay(i + 1));
        }
    }

    private saveData() {
        localStorage.setItem('AstroTrackerData', JSON.stringify(this.trackerData));
        this.isDirty = false;
        this.updateSaveButtonState();
        this.showNotification('Progress saved successfully!', 'success');
    }

    private resetData() {
        if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
            localStorage.removeItem('AstroTrackerData');
            this.trackerData = Array.from({ length: this.TOTAL_DAYS }, (_, i) => this.createDefaultDay(i + 1));
            this.isDirty = true;
            window.location.reload(); // Easiest way to re-render the whole page with default data
        }
    }

    private setDirty() {
        if (!this.isDirty) {
            this.isDirty = true;
            this.updateSaveButtonState();
        }
    }

    private updateSaveButtonState() {
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            if (this.isDirty) {
                saveBtn.classList.add('dirty');
                saveBtn.querySelector('span')!.textContent = 'Unsaved Changes';
            } else {
                saveBtn.classList.remove('dirty');
                saveBtn.querySelector('span')!.textContent = 'Save Progress';
            }
        }
    }

    private updateAllUI() {
        this.calculateProgress();
        this.updateSaveButtonState();
    }

    private attachEventListeners() {
        // Control buttons
        document.getElementById('saveBtn')?.addEventListener('click', () => this.saveData());
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportToPDF());
        document.getElementById('resetBtn')?.addEventListener('click', () => this.resetData());
        
        // Event delegation for all day card inputs
        const trackerContainer = document.getElementById('trackerContainer');
        if (!trackerContainer) return;

        trackerContainer.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;

            // Card collapse/expand
            const header = target.closest('.day-header');
            if (header) {
                header.closest('.day-card')?.classList.toggle('collapsed');
                return;
            }

            const dayCard = target.closest('.day-card');
            if (!dayCard) return;

            const day = parseInt(dayCard.dataset.day!, 10);
            const data = this.trackerData[day - 1];

            // Checkbox containers
            const checkboxContainer = target.closest('.checkbox-container');
            if (checkboxContainer) {
                const inputPath = checkboxContainer.getAttribute('data-input')!;
                const [category, key] = inputPath.split('.');
                const currentValue = (data[category] as any)[key];
                (data[category] as any)[key] = !currentValue;
                
                checkboxContainer.querySelector('.custom-checkbox')?.classList.toggle('checked');
                this.setDirtyAndUpdate();
                return;
            }

            // Tag options (Digestive Health)
            const tagOption = target.closest('.tag-option');
            if (tagOption) {
                const inputPath = tagOption.getAttribute('data-input')!;
                const [category, key] = inputPath.split('.');
                const currentValue = (data[category] as any)[key];
                (data[category] as any)[key] = !currentValue;
                tagOption.classList.toggle('selected');
                this.setDirtyAndUpdate();
                return;
            }

            // Emoji options (Energy Level)
            const emojiOption = target.closest('.emoji-option');
            if (emojiOption) {
                const group = emojiOption.parentElement!;
                const inputPath = group.getAttribute('data-input-group')!;
                const [category, key] = inputPath.split('.');
                const value = emojiOption.getAttribute('data-value') as EnergyLevel;
                
                (data[category] as any)[key] = value;
                
                group.querySelectorAll('.emoji-option').forEach(el => el.classList.remove('selected'));
                emojiOption.classList.add('selected');
                this.setDirtyAndUpdate();
                return;
            }
        });

        trackerContainer.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            const dayCard = target.closest('.day-card');
            if (!dayCard) return;

            const day = parseInt(dayCard.dataset.day!, 10);
            const data = this.trackerData[day - 1];
            const inputPath = target.getAttribute('data-input')!;
            const [category, key] = inputPath.split('.');

            if (target.type === 'number') {
                (data[category] as any)[key] = parseFloat(target.value) || 0;
            } else if (target.type === 'range') {
                 (data[category] as any)[key] = parseFloat(target.value);
                 // update text label for water slider
                 const waterText = dayCard.querySelector('.water-text');
                 if(waterText) waterText.textContent = `${target.value}/2.5L`;
            } else {
                (data[category] as any)[key] = target.value;
            }
            
            this.setDirtyAndUpdate();
        });
    }

    private setDirtyAndUpdate() {
        this.setDirty();
        this.calculateProgress();
    }
    
    // --- PROGRESS CALCULATION ---
    private calculateProgress() {
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
            return total + (score / 5); // Score out of 5 for the day
        }, 0);
        const wellnessPercent = Math.round((wellnessScore / this.TOTAL_DAYS) * 100);
        this.updateProgressUI('wellness', `${wellnessPercent}%`, wellnessPercent);
    }
    
    private updateProgressUI(metric: string, value: string, barPercent: number) {
        document.getElementById(`${metric}Progress`)!.textContent = value;
        (document.getElementById(`${metric}Bar`) as HTMLElement)!.style.width = `${barPercent}%`;
    }

    // --- PDF EXPORT ---
    private exportToPDF() {
        this.showNotification('Generating PDF report...', 'info');
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text("AstroTracker: 30-Day Transformation Report", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Report generated on: ${new Date().toLocaleDateString()}`, 14, 29);

        const tableData = this.trackerData.map(day => [
            day.day,
            day.date,
            day.fitness.workout ? '✅' : '—',
            day.fitness.pushups,
            day.hydration.intake.toFixed(1),
            day.wellness.sleep.toFixed(1),
            Object.values(day.digestiveHealth).filter(Boolean).length ? 'Yes' : 'No'
        ]);

        autoTable(doc, {
            startY: 35,
            head: [['Day', 'Date', 'Workout', 'Push-ups', 'Water (L)', 'Sleep (h)', 'Symptoms']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80] }
        });
        
        // The save method now returns a data URI when a filename is provided,
        // which is perfect for forcing downloads on mobile.
        const pdfDataUri = doc.output('dataurlstring', { filename: 'AstroTracker-Report.pdf' });
        
        // Create a temporary link to trigger the download
        const downloadLink = document.createElement('a');
        downloadLink.href = pdfDataUri;
        downloadLink.download = 'AstroTracker-Report.pdf';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        this.showNotification('PDF downloaded!', 'success');
    }

    // --- UTILITIES ---
    private showNotification(message: string, type: 'success' | 'error' | 'info') {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
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
            notification.style.bottom = '20px';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }
}

// Instantiate the app once the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new AstroTrackerApp());
} else {
    new AstroTrackerApp();
}