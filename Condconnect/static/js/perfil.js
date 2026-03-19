// Profile Logic

document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profile-form');

    if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const btnSave = profileForm.querySelector('.btn-save');
            const originalText = btnSave.innerHTML;

            // Loading state
            btnSave.disabled = true;
            btnSave.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 2a10 10 0 0 1 10 10"></path>
                </svg>
                Salvando...
            `;

            // Simulate saving
            setTimeout(() => {
                // Show success state on button
                btnSave.classList.add('success');
                btnSave.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Adicionado!
                `;

                // Restore button after 3 seconds
                setTimeout(() => {
                    btnSave.classList.remove('success');
                    btnSave.disabled = false;
                    btnSave.innerHTML = originalText;
                }, 3000);
            }, 1000);
        });
    }
});

// Add spinner style
const style = document.createElement('style');
style.textContent = `
    @keyframes spin { 100% { transform: rotate(360deg); } }
    .spinner { animation: spin 1s linear infinite; }
`;
document.head.appendChild(style);
