import React, { useState } from 'react';
import { UserSession } from '../App';

interface ReportPageProps {
  session: UserSession;
}

const ReportPage: React.FC<ReportPageProps> = ({ session }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/reports`, {
        // Here we might need to proxy through auth service or use session cookies if API supports it
        // For now, let's assume the API is also behind the auth service or we just show the user info
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch report');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!session.authenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <h1 className="text-xl mb-4">You are not logged in</h1>
        <a
          href={`${process.env.REACT_APP_KEYCLOAK_URL}/login`}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Login
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-2">Usage Reports</h1>
        <p className="mb-6 text-gray-600">Welcome, {session.user?.preferred_username || session.user?.name}</p>
        
        <button
          onClick={downloadReport}
          disabled={loading}
          className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Generating Report...' : 'Download Report'}
        </button>

        <a 
          href={`${process.env.REACT_APP_KEYCLOAK_URL}/logout`}
          className="mt-4 block text-center text-sm text-gray-500 hover:text-gray-700"
        >
          Logout
        </a>

        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportPage;
