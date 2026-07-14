const API_BASE_URL = '/api/auth';

// Helper: Save JWT and user info to localStorage
const saveAuth = (token, user) => {
  localStorage.setItem('jwt_token', token);
  localStorage.setItem('user_info', JSON.stringify(user));
};

// Helper: Get JWT and user info from localStorage
const getAuth = () => {
  const token = localStorage.getItem('jwt_token');
  const user = JSON.parse(localStorage.getItem('user_info'));
  return { token, user };
};

// Helper: Clear localStorage and redirect to login
const logout = () => {
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('user_info');
  window.location.href = '/index.html';
};

// Helper: Redirect based on role
const redirectToDashboard = (role) => {
  if (role === 'admin') {
    window.location.href = '/admin/dashboard.html';
  } else if (role === 'student') {
    window.location.href = '/student/dashboard.html';
  } else {
    // Fallback or error page
    window.location.href = '/index.html';
  }
};

// Helper: Require authentication and role
const requireAuth = (requiredRole) => {
  const { token, user } = getAuth();

  if (!token || !user) {
    logout(); // Not logged in, redirect to login
    return;
  }

  if (requiredRole && user.role !== requiredRole) {
    // Logged in but wrong role, redirect to their respective dashboard
    redirectToDashboard(user.role);
    return;
  }

  return { token, user }; // Return auth info if valid
};

// Handle login form submission
const handleLogin = async (event) => {
  event.preventDefault();

  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const loginError = document.getElementById('loginError');
  const loginButton = document.getElementById('loginButton');

  loginError.textContent = '';
  loginButton.disabled = true;
  loginButton.innerHTML = '<span class="spinner"></span> Logging in...';

  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success) {
      saveAuth(data.data.token, data.data.user);
      redirectToDashboard(data.data.user.role);
    } else {
      loginError.textContent = data.message || 'Login failed.';
    }
  } catch (error) {
    console.error('Login error:', error);
    loginError.textContent = 'An unexpected error occurred. Please try again.';
  } finally {
    loginButton.disabled = false;
    loginButton.innerHTML = 'Login';
  }
};

// Handle register form submission
const handleRegister = async (event) => {
  event.preventDefault();

  const fullName = document.getElementById('registerFullName').value;
  const email = document.getElementById('registerEmail').value;
  const matricNumber = document.getElementById('registerMatricNumber').value;
  const roomNumber = document.getElementById('registerRoomNumber').value;
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;

  const registerError = document.getElementById('registerError');
  const registerButton = document.getElementById('registerButton');

  registerError.textContent = '';
  document.querySelectorAll('.form-error').forEach(el => el.textContent = ''); // Clear all inline errors

  if (password !== confirmPassword) {
    document.getElementById('passwordConfirmError').textContent = 'Passwords do not match.';
    registerButton.disabled = false;
    registerButton.innerHTML = 'Register';
    return;
  }

  registerButton.disabled = true;
  registerButton.innerHTML = '<span class="spinner"></span> Registering...';

  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ full_name: fullName, email, matric_number: matricNumber, room_number: roomNumber, password }),
    });

    const data = await response.json();

    if (data.success) {
      // Auto-login on successful registration
      const loginResponse = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginResponse.json();

      if (loginData.success) {
        saveAuth(loginData.data.token, loginData.data.user);
        redirectToDashboard(loginData.data.user.role);
      } else {
        registerError.textContent = loginData.message || 'Registration successful, but auto-login failed. Please try logging in.';
        setTimeout(() => { window.location.href = '/index.html'; }, 2000);
      }
    } else {
      registerError.textContent = data.message || 'Registration failed.';
      // Specific error handling for unique constraints
      if (data.message && data.message.includes('Email or Matric Number already registered')) {
        if (data.message.includes('Email')) document.getElementById('emailError').textContent = 'Email already registered.';
        if (data.message.includes('Matric Number')) document.getElementById('matricNumberError').textContent = 'Matric number already registered.';
      }
    }
  } catch (error) {
    console.error('Registration error:', error);
    registerError.textContent = 'An unexpected error occurred. Please try again.';
  } finally {
    registerButton.disabled = false;
    registerButton.innerHTML = 'Register';
  }
};

// Export functions for use in other scripts
window.saveAuth = saveAuth;
window.getAuth = getAuth;
window.logout = logout;
window.requireAuth = requireAuth;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;