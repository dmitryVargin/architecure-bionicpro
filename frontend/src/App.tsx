import React, { useState, useEffect } from 'react';
import ReportPage from './components/ReportPage';

export interface UserSession {
  authenticated: boolean;
  user?: any;
}

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_KEYCLOAK_URL}/session`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setSession(data))
      .catch(err => console.error('Failed to fetch session:', err));
  }, []);

  if (!session) {
    return <div>Loading session...</div>;
  }

  return (
    <div className="App">
      <ReportPage session={session} />
    </div>
  );
};

export default App;
