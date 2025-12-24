// TODO: Wire to actual API endpoints
// Replace Promise.resolve() with actual fetch calls to:
// - POST /api/auth/login
// - POST /api/auth/signup

export async function login(email, password) {
  // TODO: Implement actual API call
  // const response = await fetch('/api/auth/login', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email, password })
  // });
  // if (!response.ok) throw new Error('Login failed');
  // return response.json();
  
  return Promise.resolve({ success: true, token: 'placeholder-token' });
}

export async function signup(payload) {
  // TODO: Implement actual API call
  // const response = await fetch('/api/auth/signup', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(payload)
  // });
  // if (!response.ok) throw new Error('Signup failed');
  // return response.json();
  
  return Promise.resolve({ success: true, token: 'placeholder-token' });
}

