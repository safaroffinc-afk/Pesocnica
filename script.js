// ============================================
// HR Portal - JavaScript
// ============================================

// Sample Data
const requestsData = [
    {
        id: 130,
        company: "SoCal Republic",
        applicant: "Steve Alpizar",
        email: "alpizarsteve@yahoo.com",
        phone: "+1 (951) 416-9589",
        regDate: "01/30/2026",
        docsComplete: 0,
        docsTotal: 2,
        status: "new",
        assigned: "BA"
    },
    {
        id: 128,
        company: "Sortico Logistics Delivery",
        applicant: "Thomas Blagogie",
        email: "tomablaco@yahoo.com",
        phone: "+1 (443) 813-3291",
        regDate: "01/30/2026",
        docsComplete: 0,
        docsTotal: 2,
        status: "in-progress",
        assigned: "KD"
    },
    {
        id: 127,
        company: "Olamob Transportation",
        applicant: "Mobolaji Olarewaju",
        email: "Olamob2000@yahoo.com",
        phone: "+1 (773) 459-8287",
        regDate: "01/29/2026",
        docsComplete: 0,
        docsTotal: 2,
        status: "in-progress",
        assigned: "BA"
    },
    {
        id: 126,
        company: "G V M Services",
        applicant: "Jorge Orellana",
        email: "Chusinorellana@hotmail.com",
        phone: "+1 (203) 887-0759",
        regDate: "01/29/2026",
        docsComplete: 0,
        docsTotal: 2,
        status: "in-progress",
        assigned: "BA"
    },
    {
        id: 125,
        company: "Omw2U LLC",
        applicant: "Nancy Monteiro",
        email: "Omw.2u@icloud.com",
        phone: "+1 (334) 942-3434",
        regDate: "01/29/2026",
        docsComplete: 1,
        docsTotal: 2,
        status: "in-progress",
        assigned: "BA"
    },
    {
        id: 124,
        company: "Esp Relocators Inc",
        applicant: "Marcos Espaillat",
        email: "t0nie27@yahoo.com",
        phone: "+1 (848) 468-0553",
        regDate: "01/29/2026",
        docsComplete: 0,
        docsTotal: 2,
        status: "new",
        assigned: "KD"
    },
    {
        id: 123,
        company: "Brotherly Hustle Haulers",
        applicant: "Trevon Seymour",
        email: "Trevon@brotherlyhustle.com",
        phone: "+1 (914) 435-4563",
        regDate: "01/29/2026",
        docsComplete: 0,
        docsTotal: 2,
        status: "in-progress",
        assigned: "KD"
    },
    {
        id: 122,
        company: "Freya S Multi Services LLC",
        applicant: "Djimmy Salomon",
        email: "keyantenewstart@yahoo.com",
        phone: "+1 (305) 990-7549",
        regDate: "01/28/2026",
        docsComplete: 2,
        docsTotal: 2,
        status: "rejected",
        assigned: "BA"
    },
    {
        id: 121,
        company: "Maylis H H Trucking Services LLC",
        applicant: "Felix Horta",
        email: "mfabrallc@gmail.com",
        phone: "+1 (402) 270-0212",
        regDate: "01/28/2026",
        docsComplete: 2,
        docsTotal: 2,
        status: "approved",
        assigned: "KD"
    },
    {
        id: 120,
        company: "Verified Expediting",
        applicant: "Richard Netherwood",
        email: "comson66@gmail.com",
        phone: "+1 (210) 895-8444",
        regDate: "01/28/2026",
        docsComplete: 1,
        docsTotal: 2,
        status: "in-progress",
        assigned: "KD"
    }
];

// Color palette for company avatars
const avatarColors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444',
    '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6'
];

// Utility Functions
function getInitials(name) {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function getRandomColor(seed) {
    const index = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return avatarColors[index % avatarColors.length];
}

function getStatusLabel(status) {
    const labels = {
        'new': 'New',
        'in-progress': 'In Progress',
        'approved': 'Approved',
        'rejected': 'Rejected'
    };
    return labels[status] || status;
}

// Render Table Row
function renderTableRow(request) {
    const companyInitials = getInitials(request.company);
    const companyColor = getRandomColor(request.company);
    const docsClass = request.docsComplete === request.docsTotal ? 'complete' : 'incomplete';

    return `
        <tr data-id="${request.id}">
            <td>
                <input type="checkbox" class="checkbox row-checkbox">
            </td>
            <td>
                <span class="id-badge">${request.id}</span>
            </td>
            <td>
                <div class="company-cell">
                    <div class="company-avatar" style="background: ${companyColor}">
                        ${companyInitials}
                    </div>
                    <span class="company-name">${request.company}</span>
                </div>
            </td>
            <td>
                <div class="applicant-cell">
                    <img class="applicant-avatar"
                         src="https://ui-avatars.com/api/?name=${encodeURIComponent(request.applicant)}&background=e2e8f0&color=475569&size=32"
                         alt="${request.applicant}">
                    <span class="applicant-name">${request.applicant}</span>
                </div>
            </td>
            <td>
                <div class="contact-cell">
                    <span class="contact-email">${request.email}</span>
                    <span class="contact-phone">${request.phone}</span>
                </div>
            </td>
            <td>
                <span class="date-cell">${request.regDate}</span>
            </td>
            <td>
                <div class="docs-cell">
                    <span class="docs-badge ${docsClass}">
                        <i class="fas fa-file-alt"></i>
                        ${request.docsComplete}/${request.docsTotal}
                    </span>
                </div>
            </td>
            <td>
                <span class="status-badge ${request.status}">
                    <span class="status-dot"></span>
                    ${getStatusLabel(request.status)}
                </span>
            </td>
            <td>
                <div class="assigned-cell">
                    <span class="assigned-badge ${request.assigned.toLowerCase()}">
                        ${request.assigned}
                    </span>
                </div>
            </td>
            <td>
                <div class="actions-cell">
                    <button class="action-btn" data-tooltip="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn" data-tooltip="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" data-tooltip="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Render Table
function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = data.map(renderTableRow).join('');
}

// Filter Data
function filterData(searchTerm, statusFilter) {
    return requestsData.filter(request => {
        const matchesSearch = searchTerm === '' ||
            request.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.applicant.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.phone.includes(searchTerm);

        const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

        return matchesSearch && matchesStatus;
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initial render
    renderTable(requestsData);

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');

    searchInput.addEventListener('input', (e) => {
        const filtered = filterData(e.target.value, statusFilter.value);
        renderTable(filtered);
    });

    statusFilter.addEventListener('change', (e) => {
        const filtered = filterData(searchInput.value, e.target.value);
        renderTable(filtered);
    });

    // Select all checkbox
    const selectAll = document.getElementById('selectAll');
    selectAll.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
    });

    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 992 &&
            !sidebar.contains(e.target) &&
            !menuToggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });

    // Sortable columns
    const sortableHeaders = document.querySelectorAll('.sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const sortKey = header.dataset.sort;
            // Toggle sort direction
            const currentDirection = header.dataset.direction || 'asc';
            const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
            header.dataset.direction = newDirection;

            // Update icon
            const icon = header.querySelector('i');
            icon.className = newDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';

            // Sort data
            const sortedData = [...requestsData].sort((a, b) => {
                let valA, valB;
                switch(sortKey) {
                    case 'id':
                        valA = a.id;
                        valB = b.id;
                        break;
                    case 'company':
                        valA = a.company.toLowerCase();
                        valB = b.company.toLowerCase();
                        break;
                    case 'date':
                        valA = new Date(a.regDate);
                        valB = new Date(b.regDate);
                        break;
                    default:
                        return 0;
                }

                if (valA < valB) return newDirection === 'asc' ? -1 : 1;
                if (valA > valB) return newDirection === 'asc' ? 1 : -1;
                return 0;
            });

            renderTable(sortedData);
        });
    });

    // Pagination click handlers
    const paginationBtns = document.querySelectorAll('.btn-pagination');
    paginationBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.disabled) return;

            // Remove active from all
            paginationBtns.forEach(b => b.classList.remove('active'));

            // Add active to clicked (if it's a number button)
            if (!btn.querySelector('i')) {
                btn.classList.add('active');
            }
        });
    });

    // Row action handlers
    document.getElementById('tableBody').addEventListener('click', (e) => {
        const actionBtn = e.target.closest('.action-btn');
        if (!actionBtn) return;

        const row = e.target.closest('tr');
        const id = row.dataset.id;

        if (actionBtn.classList.contains('delete')) {
            if (confirm('Are you sure you want to delete this request?')) {
                row.style.animation = 'fadeOut 0.3s ease-out forwards';
                setTimeout(() => row.remove(), 300);
            }
        } else if (actionBtn.querySelector('.fa-eye')) {
            console.log('View details for request:', id);
            // Show modal or navigate to details page
        } else if (actionBtn.querySelector('.fa-edit')) {
            console.log('Edit request:', id);
            // Open edit form
        }
    });

    // Add Request button
    const addRequestBtn = document.querySelector('.btn-primary');
    addRequestBtn.addEventListener('click', () => {
        console.log('Open add request modal');
        // Open add request modal/form
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+K for search focus
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }

        // Escape to close sidebar on mobile
        if (e.key === 'Escape') {
            sidebar.classList.remove('open');
        }
    });
});

// Add fadeOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        to {
            opacity: 0;
            transform: translateX(-20px);
        }
    }
`;
document.head.appendChild(style);
