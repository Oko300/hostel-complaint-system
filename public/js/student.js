document.addEventListener('DOMContentLoaded', () => {
  const auth = requireAuth('student'); // Ensure user is logged in and is a student
  if (!auth) return; // If not authenticated or not student, requireAuth will redirect

  const { token, user } = auth;
  const API_BASE_URL = '/api/complaints';

  // Populate sidebar user info
  const studentNameElement = document.getElementById('studentName');
  const studentRoomElement = document.getElementById('studentRoom');
  if (studentNameElement) studentNameElement.textContent = user.full_name;
  if (studentRoomElement) studentRoomElement.textContent = `Room: ${user.room_number}`;

  // Handle logout button
  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  // Function to fetch complaints
  const fetchComplaints = async (statusFilter = '', categoryFilter = '') => {
    try {
      let url = `${API_BASE_URL}/my`;
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);
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
        console.error('Failed to fetch complaints:', data.message);
        return [];
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
      return [];
    }
  };

  // Dashboard specific logic
  if (window.location.pathname.includes('dashboard.html')) {
    const updateDashboard = async () => {
      const complaints = await fetchComplaints();

      document.getElementById('totalComplaints').textContent = complaints.length;
      document.getElementById('pendingComplaints').textContent = complaints.filter(c => c.status === 'Pending').length;
      document.getElementById('inProgressComplaints').textContent = complaints.filter(c => c.status === 'In Progress').length;
      document.getElementById('resolvedComplaints').textContent = complaints.filter(c => c.status === 'Resolved').length;

      const recentComplaintsBody = document.getElementById('recentComplaintsBody');
      if (recentComplaintsBody) {
        recentComplaintsBody.innerHTML = '';
        const recent = complaints.slice(0, 5); // Last 5 complaints
        if (recent.length === 0) {
          recentComplaintsBody.innerHTML = `<tr><td colspan="5" class="empty-state">No recent complaints.</td></tr>`;
        } else {
          recent.forEach(complaint => {
            const row = `
              <tr>
                <td>${complaint.title}</td>
                <td>${complaint.category}</td>
                <td><span class="badge priority-${complaint.priority.toLowerCase()}">${complaint.priority}</span></td>
                <td><span class="badge badge-${complaint.status.toLowerCase().replace(/\s/g, '')}">${complaint.status}</span></td>
                <td>${new Date(complaint.created_at).toLocaleDateString()}</td>
              </tr>
            `;
            recentComplaintsBody.innerHTML += row;
          });
        }
      }
    };
    updateDashboard();
  }

  // Submit Complaint specific logic
  if (window.location.pathname.includes('submit.html')) {
    const submitForm = document.getElementById('submitComplaintForm');
    const submitError = document.getElementById('submitError');
    const submitSuccess = document.getElementById('submitSuccess');
    const submitButton = document.getElementById('submitButton');

    submitForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitError.textContent = '';
      submitSuccess.innerHTML = '';
      submitButton.disabled = true;
      submitButton.innerHTML = '<span class="spinner"></span> Submitting...';

      const title = document.getElementById('complaintTitle').value;
      const category = document.getElementById('complaintCategory').value;
      const priority = document.querySelector('input[name="complaintPriority"]:checked')?.value || 'Medium';
      const description = document.getElementById('complaintDescription').value;

      if (description.length < 20) {
        submitError.textContent = 'Description must be at least 20 characters long.';
        submitButton.disabled = false;
        submitButton.innerHTML = 'Submit Complaint';
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ title, category, priority, description }),
        });

        const data = await response.json();

        if (data.success) {
          submitSuccess.innerHTML = `
            <div class="alert alert-success">
              Complaint submitted successfully! ID: ${data.data.id}.
              <a href="/student/track.html?id=${data.data.id}">Track this complaint</a>
            </div>
          `;
          submitForm.reset(); // Clear form
        } else {
          submitError.textContent = data.message || 'Failed to submit complaint.';
        }
      } catch (error) {
        console.error('Submit complaint error:', error);
        submitError.textContent = 'An unexpected error occurred. Please try again.';
      } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Submit Complaint';
      }
    });
  }

  // Track Complaints specific logic
  if (window.location.pathname.includes('track.html')) {
    const statusFilterSelect = document.getElementById('statusFilter');
    const complaintsTableBody = document.getElementById('complaintsTableBody');
    const complaintDetailModal = document.getElementById('complaintDetailModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalTitle = document.getElementById('modalComplaintTitle');
    const modalCategory = document.getElementById('modalComplaintCategory');
    const modalPriority = document.getElementById('modalComplaintPriority');
    const modalStatus = document.getElementById('modalComplaintStatus');
    const modalDescription = document.getElementById('modalComplaintDescription');
    const modalAdminResponse = document.getElementById('modalAdminResponse');
    const modalCreatedAt = document.getElementById('modalCreatedAt');
    const modalUpdatedAt = document.getElementById('modalUpdatedAt');
    const statusTimeline = document.getElementById('statusTimeline');

    const renderComplaintsTable = (complaints) => {
      complaintsTableBody.innerHTML = '';
      if (complaints.length === 0) {
        complaintsTableBody.innerHTML = `<tr><td colspan="7" class="empty-state">No complaints found.</td></tr>`;
        return;
      }

      complaints.forEach(complaint => {
        const row = `
          <tr>
            <td>${complaint.title}</td>
            <td>${complaint.category}</td>
            <td><span class="badge priority-${complaint.priority.toLowerCase()}">${complaint.priority}</span></td>
            <td><span class="badge badge-${complaint.status.toLowerCase().replace(/\s/g, '')}">${complaint.status}</span></td>
            <td>${new Date(complaint.created_at).toLocaleDateString()}</td>
            <td>${complaint.updated_at ? new Date(complaint.updated_at).toLocaleDateString() : 'N/A'}</td>
            <td>
              <button class="btn btn-sm btn-primary view-details-btn" data-id="${complaint.id}">View Details</button>
            </td>
          </tr>
        `;
        complaintsTableBody.innerHTML += row;
      });

      document.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', (e) => openComplaintModal(e.target.dataset.id));
      });
    };

    const openComplaintModal = async (id) => {
      try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (data.success) {
          const complaint = data.data;
          modalTitle.textContent = complaint.title;
          modalCategory.textContent = complaint.category;
          modalPriority.innerHTML = `<span class="badge priority-${complaint.priority.toLowerCase()}">${complaint.priority}</span>`;
          modalStatus.innerHTML = `<span class="badge badge-${complaint.status.toLowerCase().replace(/\s/g, '')}">${complaint.status}</span>`;
          modalDescription.textContent = complaint.description;
          modalAdminResponse.textContent = complaint.admin_response || 'Awaiting response from admin.';
          modalCreatedAt.textContent = new Date(complaint.created_at).toLocaleString();
          modalUpdatedAt.textContent = complaint.updated_at ? new Date(complaint.updated_at).toLocaleString() : 'N/A';

          // Status timeline
          statusTimeline.innerHTML = `
            <div class="timeline-item ${complaint.status === 'Pending' ? 'active' : ''}">Submitted</div>
            <div class="timeline-item ${complaint.status === 'In Progress' ? 'active' : ''}">In Progress</div>
            <div class="timeline-item ${complaint.status === 'Resolved' ? 'active' : ''}">Resolved</div>
          `;

          complaintDetailModal.classList.add('show');
        } else {
          alert(data.message || 'Failed to load complaint details.');
        }
      } catch (error) {
        console.error('Error opening complaint modal:', error);
        alert('An error occurred while fetching complaint details.');
      }
    };

    modalCloseBtn.addEventListener('click', () => {
      complaintDetailModal.classList.remove('show');
    });

    window.addEventListener('click', (event) => {
      if (event.target === complaintDetailModal) {
        complaintDetailModal.classList.remove('show');
      }
    });

    const loadComplaints = async () => {
      const complaints = await fetchComplaints();
      let filteredComplaints = complaints;

      const selectedStatus = statusFilterSelect.value;
      if (selectedStatus !== 'All') {
        filteredComplaints = complaints.filter(c => c.status === selectedStatus);
      }
      renderComplaintsTable(filteredComplaints);

      // Check if a specific complaint ID is in the URL and open modal
      const urlParams = new URLSearchParams(window.location.search);
      const complaintId = urlParams.get('id');
      if (complaintId) {
        openComplaintModal(complaintId);
      }
    };

    statusFilterSelect.addEventListener('change', loadComplaints);
    loadComplaints();
  }
});