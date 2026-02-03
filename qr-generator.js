// Reliable QR Generator System
class QRGenerator {
    constructor() {
        // 1. Get DOM Elements
        this.container = document.getElementById('qrcode');
        this.generateBtn = document.getElementById('generate-qr');
        this.downloadBtn = document.getElementById('download-qr');
        this.deleteBtn = document.getElementById('delete-qr');
        
        // Inputs
        this.nameInput = document.getElementById('student-name');
        this.idInput = document.getElementById('student-id');
        this.campusInput = document.getElementById('student-campus');
        this.emailInput = document.getElementById('student-email'); // Optional
        
        // Display Text Elements
        this.displayName = document.getElementById('qr-student-name');
        this.displayId = document.getElementById('qr-student-id');
        this.displayCampus = document.getElementById('qr-campus');
        
        // Security Salt
        this.secretSalt = "icct-secure-2024";
        
        // Initialize
        this.init();
    }
    
    init() {
        console.log("QR System Initializing...");
        
        // 2. Check if Library is Loaded
        if (typeof QRCode === 'undefined') {
            console.error("CRITICAL ERROR: QRCode library is missing.");
            if (this.container) {
                this.container.innerHTML = '<p style="color:red; font-weight:bold;">Error: Internet required to load QR Library.</p>';
            }
            return;
        }

        // 3. Load Saved Data (if any)
        this.loadSavedQR();
        
        // 4. Attach Click Listeners
        if (this.generateBtn) {
            this.generateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.generate();
            });
        }
        
        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.downloadQR();
            });
        }
        
        if (this.deleteBtn) {
            this.deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.deleteQR();
            });
        }
    }
    
    generate() {
        // 1. Validate Inputs
        const name = this.nameInput ? this.nameInput.value.trim() : '';
        const id = this.idInput ? this.idInput.value.trim() : '';
        const campus = this.campusInput ? this.campusInput.value : '';
        const email = this.emailInput ? this.emailInput.value.trim() : '';
        
        if (!name || !id || !campus) {
            alert('Please fill in Name, Student ID, and Campus to generate a QR code.');
            return;
        }
        
        // 2. Create Data Object
        const studentData = {
            studentId: id,
            name: name,
            campus: campus,
            email: email,
            generatedAt: new Date().toISOString(),
            valid: true,
            version: "2.0"
        };
        
        // 3. Clear previous QR
        if (this.container) this.container.innerHTML = '';
        
        try {
            // 4. Generate the QR Code Image
            new QRCode(this.container, {
                text: JSON.stringify(studentData),
                width: 200,
                height: 200,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });
            
            // 5. Update Text Display below QR
            if(this.displayName) this.displayName.textContent = name;
            if(this.displayId) this.displayId.innerHTML = `<i class="fas fa-id-badge"></i> ID: ${id}`;
            if(this.displayCampus) this.displayCampus.innerHTML = `<i class="fas fa-university"></i> ${campus}`;
            
            // 6. Save to LocalStorage
            localStorage.setItem('icctStudentQR', JSON.stringify(studentData));
            
            // 7. Enable Buttons
            if(this.downloadBtn) this.downloadBtn.disabled = false;
            if(this.deleteBtn) this.deleteBtn.disabled = false;
            
            // 8. Success Message
            // We use a small timeout to let the image render before alerting
            setTimeout(() => {
                console.log("QR Generated Successfully");
            }, 100);
            
        } catch (e) {
            console.error("Generation Error:", e);
            alert("Error generating QR. Please check the console for details.");
        }
    }
    
    loadSavedQR() {
        const saved = localStorage.getItem('icctStudentQR');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                
                // Fill inputs
                if(this.nameInput) this.nameInput.value = data.name;
                if(this.idInput) this.idInput.value = data.studentId;
                if(this.campusInput) this.campusInput.value = data.campus;
                
                // Trigger Generation automatically
                // We use a small delay to ensure the library is fully ready
                setTimeout(() => this.generate(), 500);
            } catch(e) {
                console.error("Error loading saved data", e);
            }
        }
    }

    downloadQR() {
        const img = this.container.querySelector('img');
        if (img) {
            const link = document.createElement('a');
            link.href = img.src;
            link.download = `ICCT_QR_${this.idInput.value}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            alert('Please generate a QR code first.');
        }
    }

    deleteQR() {
        if(confirm("Delete this QR code?")) {
            localStorage.removeItem('icctStudentQR');
            location.reload();
        }
    }
}

// Initialize Safety Check
document.addEventListener('DOMContentLoaded', () => {
    if (!window.qrGenerator) {
        window.qrGenerator = new QRGenerator();
    }
});