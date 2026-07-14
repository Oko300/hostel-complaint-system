document.addEventListener('DOMContentLoaded', () => {
  const auth = requireAuth('admin'); // Ensure user is logged in and is an admin
  if (!auth) return; // If not authenticated or not admin, requireAuth will redirect

  const { token, user } = auth;
  const API_BASE_URL_ADMIN = '/api/admin';
  const API_BASE_URL_COMPLAINTS = '/api/complaints';

  // Populate sidebar admin info
  const adminNameElement = document.getElementById('adminName');
  if (adminNameElement) adminNameElement.textContent = user.full_name;

  // Handle logout button
  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  // Function to fetch admin stats
  const fetchAdminStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL_ADMIN}/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        return data.data;
      } else {
        console.error('Failed to fetch admin stats:', data.message);
        return null;
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      return null;
    }
  };

  // Function to fetch all complaints for admin
  const fetchAllComplaints = async (statusFilter = '', categoryFilter = '', searchTerm = '') => {
    try {
      let url = `${API_BASE_URL_ADMIN}/complaints`;
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (searchTerm) params.append('search', searchTerm);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        return data.data;
      } else {
        console.error('Failed to fetch all complaints:', data.message);
        return [];
      }
    } catch (error) {
      console.error('Error fetching all complaints:', error);
      return [];
    }
  };

  // Dashboard specific logic
  if (window.location.pathname.includes('admin/dashboard.html')) {
    const updateDashboard = async () => {
      const stats = await fetchAdminStats();
      if (stats) {
        document.getElementById('totalComplaints').textContent = stats.totalComplaints;
        document.getElementById('pendingComplaints').textContent = stats.pendingComplaints;
        document.getElementById('inProgressComplaints').textContent = stats.inProgressComplaints;
        document.getElementById('resolvedComplaints').textContent = stats.resolvedComplaints;
        document.getElementById('rejectedComplaints').textContent = stats.rejectedComplaints;

        // Recent Complaints Table
        const recentComplaintsBody = document.getElementById('recentComplaintsBody');
        if (recentComplaintsBody) {
          recentComplaintsBody.innerHTML = '';
          const complaints = await fetchAllComplaints(); // Fetch all to get recent
          const recent = complaints.slice(0, 5); // Last 5 complaints
          if (recent.length === 0) {
            recentComplaintsBody.innerHTML = `<tr><td colspan="5" class="empty-state">No recent complaints.</td></tr>`;
          } else {
            recent.forEach(complaint => {
              const row = `
                <tr>
                  <td>${complaint.user_full_name}</td>
                  <td>${complaint.user_room_number}</td>
                  <td>${complaint.category}</td>
                  <td><span class="badge badge-${complaint.status.toLowerCase().replace(/\s/g, '')}">${complaint.status}</span></td>
                  <td>${new Date(complaint.created_at).toLocaleDateString()}</td>
                </tr>
              `;
              recentComplaintsBody.innerHTML += row;
            });
          }
        }

        // Complaints by Category
        const categoryList = document.getElementById('complaintsByCategoryList');
        if (categoryList) {
          categoryList.innerHTML = '';
          const total = stats.totalComplaints;
          if (total === 0) {
            categoryList.innerHTML = `<div class="empty-state">No complaints to categorize.</div>`;
          } else {
            for (const category in stats.complaintsByCategory) {
              const count = stats.complaintsByCategory[category];
              const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
              const item = `
                <div class="category-item">
                  <span>${category} (${count})</span>
                  <div class="category-bar-wrapper">
                    <div class="category-bar" style="width: ${percentage}%;"></div>
                  </div>
                  <span>${percentage}%</span>
                </div>
              `;
              categoryList.innerHTML += item;
            }
          }
        }
      }
    };
    updateDashboard();
  }

  // All Complaints specific logic
  if (window.location.pathname.includes('admin/complaints.html')) {
    const statusFilterSelect = document.getElementById('statusFilter');
    const categoryFilterSelect = document.getElementById('categoryFilter');
    const searchInput = document.getElementById('complaintSearch');
    const complaintsTableBody = document.getElementById('complaintsTableBody');
    const complaintManageModal = document.getElementById('complaintManageModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalComplaintId = document.getElementById('modalComplaintId');
    const modalStudentName = document.getElementById('modalStudentName');
    const modalStudentMatric = document.getElementById('modalStudentMatric');
    const modalStudentRoom = document.getElementById('modalStudentRoom');
    const modalComplaintTitle = document.getElementById('modalComplaintTitle');
    const modalComplaintCategory = document.getElementById('modalComplaintCategory');
    const modalComplaintPriority = document.getElementById('modalComplaintPriority');
    const modalComplaintDescription = document.getElementById('modalComplaintDescription');
    const modalCreatedAt = document.getElementById('modalCreatedAt');
    const modalUpdatedAt = document.getElementById('modalUpdatedAt');
    const modalStatusSelect = document.getElementById('modalStatusSelect');
    const modalAdminResponse = document.getElementById('modalAdminResponse');
    const updateComplaintButton = document.getElementById('updateComplaintButton');

    let currentComplaintId = null;

    const renderComplaintsTable = (complaints) => {
      complaintsTableBody.innerHTML = '';
      if (complaints.length === 0) {
        complaintsTableBody.innerHTML = `<tr><td colspan="9" class="empty-state">No complaints found.</td></tr>`;
        return;
      }

      complaints.forEach(complaint => {
        const row = `
          <tr>
            <td>${complaint.id}</td>
            <td>${complaint.user_full_name}</td>
            <td>${complaint.user_room_number}</td>
            <td>${complaint.title}</td>
            <td>${complaint.category}</td>
            <td><span class="badge priority-${complaint.priority.toLowerCase()}">${complaint.priority}</span></td>
            <td><span class="badge badge-${complaint.status.toLowerCase().replace(/\s/g, '')}">${complaint.status}</span></td>
            <td>${new Date(complaint.created_at).toLocaleDateString()}</td>
            <td>
              <button class="btn btn-sm btn-primary manage-complaint-btn" data-id="${complaint.id}">Manage</button>
            </td>
          </tr>
        `;
        complaintsTableBody.innerHTML += row;
      });

      document.querySelectorAll('.manage-complaint-btn').forEach(button => {
        button.addEventListener('click', (e) => openManageComplaintModal(e.target.dataset.id));
      });
    };

    const openManageComplaintModal = async (id) => {
      try {
        const response = await fetch(`${API_BASE_URL_COMPLAINTS}/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (data.success) {
          const complaint = data.data;
          currentComplaintId = complaint.id;

          modalComplaintId.textContent = complaint.id;
          modalStudentName.textContent = complaint.user_full_name;
          modalStudentMatric.textContent = complaint.user_matric_number;
          modalStudentRoom.textContent = complaint.user_room_number;
          modalComplaintTitle.textContent = complaint.title;
          modalComplaintCategory.textContent = complaint.category;
          modalComplaintPriority.innerHTML = `<span class="badge priority-${complaint.priority.toLowerCase()}">${complaint.priority}</span>`;
          modalComplaintDescription.textContent = complaint.description;
          modalCreatedAt.textContent = new Date(complaint.created_at).toLocaleString();
          modalUpdatedAt.textContent = complaint.updated_at ? new Date(complaint.updated_at).toLocaleString() : 'N/A';
          modalStatusSelect.value = complaint.status;
          modalAdminResponse.value = complaint.admin_response || '';

          complaintManageModal.classList.add('show');
        } else {
          alert(data.message || 'Failed to load complaint details.');
        }
      } catch (error) {
        console.error('Error opening manage complaint modal:', error);
        alert('An error occurred while fetching complaint details.');
      }
    };

    modalCloseBtn.addEventListener('click', () => {
      complaintManageModal.classList.remove('show');
    });

    window.addEventListener('click', (event) => {
      if (event.target === complaintManageModal) {
        complaintManageModal.classList.remove('show');
      }
    });

    updateComplaintButton.addEventListener('click', async () => {
      if (!currentComplaintId) return;

      const newStatus = modalStatusSelect.value;
      const newAdminResponse = modalAdminResponse.value;

      try {
        const response = await fetch(`${API_BASE_URL_ADMIN}/complaints/${currentComplaintId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus, admin_response: newAdminResponse }),
        });

        const data = await response.json();

        if (data.success) {
          alert('Complaint updated successfully!');
          complaintManageModal.classList.remove('show');
          loadComplaints(); // Refresh table
        } else {
          alert(data.message || 'Failed to update complaint.');
        }
      } catch (error) {
        console.error('Error updating complaint:', error);
        alert('An error occurred while updating the complaint.');
      }
    });

    const loadComplaints = async () => {
      const selectedStatus = statusFilterSelect.value === 'All' ? '' : statusFilterSelect.value;
      const selectedCategory = categoryFilterSelect.value === 'All' ? '' : categoryFilterSelect.value;
      const searchTerm = searchInput.value;
      const complaints = await fetchAllComplaints(selectedStatus, selectedCategory, searchTerm);
      renderComplaintsTable(complaints);
    };

    statusFilterSelect.addEventListener('change', loadComplaints);
    categoryFilterSelect.addEventListener('change', loadComplaints);
    searchInput.addEventListener('input', loadComplaints); // Live search
    loadComplaints();
  }

  // Reports specific logic
  if (window.location.pathname.includes('admin/reports.html')) {
    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');
    const generateReportButton = document.getElementById('generateReportButton');
    const reportSummary = document.getElementById('reportSummary');
    const reportTableBody = document.getElementById('reportTableBody');
    const exportCsvButton = document.getElementById('exportCsvButton');

    let currentReportData = [];

    const generateReport = async () => {
      const fromDate = fromDateInput.value;
      const toDate = toDateInput.value;

      if (!fromDate || !toDate) {
        alert('Please select both From Date and To Date.');
        return;
      }

      try {
        let url = `${API_BASE_URL_ADMIN}/reports`;
        const params = new URLSearchParams();
        params.append('from', fromDate);
        params.append('to', toDate);
        url += `?${params.toString()}`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (data.success) {
          currentReportData = data.data.complaints;
          const stats = data.data.summary;

          reportSummary.innerHTML = `
            <div class="card stat-card primary"><h3>Total</h3><p>${stats.total}</p></div>
            <div class="card stat-card warning"><h3>Pending</h3><p>${stats.pending}</p></div>
            <div class="card stat-card info"><h3>In Progress</h3><p>${stats.inProgress}</p></div>
            <div class="card stat-card success"><h3>Resolved</h3><p>${stats.resolved}</p></div>
            <div class="card stat-card danger"><h3>Rejected</h3><p>${stats.rejected}</p></div>
          `;

          reportTableBody.innerHTML = '';
          if (currentReportData.length === 0) {
            reportTableBody.innerHTML = `<tr><td colspan="10" class="empty-state">No complaints found for the selected period.</td></tr>`;
          } else {
            currentReportData.forEach(complaint => {
              const row = `
                <tr>
                  <td>${complaint.id}</td>
                  <td>${complaint.user_full_name}</td>
                  <td>${complaint.user_matric_number}</td>
                  <td>${complaint.user_room_number}</td>
                  <td>${complaint.title}</td>
                  <td>${complaint.category}</td>
                  <td><span class="badge priority-${complaint.priority.toLowerCase()}">${complaint.priority}</span></td>
                  <td><span class="badge badge-${complaint.status.toLowerCase().replace(/\s/g, '')}">${complaint.status}</span></td>
                  <td>${new Date(complaint.created_at).toLocaleDateString()}</td>
                  <td>${complaint.admin_response || 'N/A'}</td>
                </tr>
              `;
              reportTableBody.innerHTML += row;
            });
          }
        } else {
          alert(data.message || 'Failed to generate report.');
        }
      } catch (error) {
        console.error('Error generating report:', error);
        alert('An error occurred while generating the report.');
      }
    };

    generateReportButton.addEventListener('click', generateReport);

    exportCsvButton.addEventListener('click', () => {
      if (currentReportData.length === 0) {
        alert('No data to export.');
        return;
      }

      const headers = [
        'ID', 'Student Name', 'Matric Number', 'Room Number', 'Title',
        'Category', 'Priority', 'Status', 'Submitted Date', 'Admin Response'
      ];
      const rows = currentReportData.map(c => [
        c.id, c.user_full_name, c.user_matric_number, c.user_room_number, c.title,
        c.category, c.priority, c.status, new Date(c.created_at).toLocaleDateString(),
        c.admin_response || 'N/A'
      ]);

      let csvContent = "data:text/csv;charset=utf-8,"
        + headers.join(',') + "\n"
        + rows.map(e => e.join(',')).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "complaint_report.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }
});