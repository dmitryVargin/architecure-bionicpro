import React, { useState } from 'react';
import { UserSession } from '../App';

interface ReportData {
  first_name: string;
  email: string;
  total_measurements: number;
  avg_signal: number;
  min_signal: number;
  max_signal: number;
  first_record: string;
  last_record: string;
}

interface ReportPageProps {
  session: UserSession;
}

const ReportPage: React.FC<ReportPageProps> = ({ session }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportData[] | null>(null);
  const [noData, setNoData] = useState<string | null>(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setNoData(null);
      setReport(null);

      const response = await fetch(`${process.env.REACT_APP_KEYCLOAK_URL}/reports`, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });

      if (response.status === 401) {
        setError('Session expired. Please log in again.');
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch report');

      const json = await response.json();

      if (json.data.length === 0) {
        setNoData(json.message);
      } else {
        setReport(json.data);
      }
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
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-xl">
        <h1 className="text-2xl font-bold mb-2">Usage Reports</h1>
        <p className="mb-6 text-gray-600">
          Welcome, {session.user?.preferred_username || session.user?.name}
        </p>

        <button
          onClick={fetchReport}
          disabled={loading}
          className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Loading...' : 'Get My Report'}
        </button>

        <a
          href={`${process.env.REACT_APP_KEYCLOAK_URL}/logout`}
          className="mt-4 block text-center text-sm text-gray-500 hover:text-gray-700"
        >
          Logout
        </a>

        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>
        )}

        {noData && (
          <div className="mt-4 p-4 bg-yellow-50 text-yellow-800 rounded">{noData}</div>
        )}

        {report && report.map((row, i) => (
          <div key={i} className="mt-6 border rounded p-4 bg-gray-50">
            <p className="font-semibold text-lg">{row.first_name} ({row.email})</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-700">
              <span className="font-medium">Measurements:</span>
              <span>{row.total_measurements}</span>
              <span className="font-medium">Avg signal:</span>
              <span>{Number(row.avg_signal).toFixed(4)}</span>
              <span className="font-medium">Min signal:</span>
              <span>{Number(row.min_signal).toFixed(4)}</span>
              <span className="font-medium">Max signal:</span>
              <span>{Number(row.max_signal).toFixed(4)}</span>
              <span className="font-medium">First record:</span>
              <span>{row.first_record}</span>
              <span className="font-medium">Last record:</span>
              <span>{row.last_record}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportPage;
