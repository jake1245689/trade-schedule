import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchJobs(user.id);
      } else {
        navigate("/login");
      }
    };
    getUser();
  }, [navigate]);

  const fetchJobs = (userId) => {
    axios.get(`http://localhost:5000/api/jobs/${userId}`)
      .then(res => {
        const events = res.data.map(job => ({
          id: job.id,
          title: job.job_name,
          start: job.start_date,
          color: job.status === 'complete' ? 'green' : 'blue'
        }));
        setJobs(events);
      })
      .catch(err => alert("Failed to fetch jobs: " + err.message));
  };

  const markJobComplete = (jobId, jobName) => {
    if (window.confirm(`Mark job "${jobName}" as complete? This may shift future jobs.`)) {
      setLoading(true);
      const actualCompletionDate = new Date().toISOString().split('T')[0];
      axios.post("http://localhost:5000/api/complete-job", {
        jobId,
        actualCompletionDate
      })
        .then(() => {
          setToastMessage("Job marked complete and schedule updated.");
          fetchJobs(userId);
        })
        .catch(err => alert("Error: " + err.message))
        .finally(() => setLoading(false));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Job Schedule</h1>
        <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded">
          Logout
        </button>
      </div>

      {toastMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded mb-4">
          {toastMessage}
        </div>
      )}

      {loading && <p>Processing...</p>}

      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={jobs}
        eventClick={(info) => markJobComplete(info.event.id, info.event.title)}
      />

      <h2 className="text-xl font-semibold mt-8 mb-2">Job List</h2>
      <ul>
        {jobs.map(job => (
          <li key={job.id} className="mb-2">
            <span className="mr-4">{job.title} - {job.start}</span>
            {job.color !== 'green' && (
              <button
                className="bg-blue-500 text-white px-2 py-1 rounded"
                onClick={() => markJobComplete(job.id, job.title)}
                disabled={loading}
              >
                Mark Complete
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
