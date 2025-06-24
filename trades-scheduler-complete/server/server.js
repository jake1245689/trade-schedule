require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.get('/api/jobs/:userId', async (req, res) => {
  const { userId } = req.params;
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: true });

  if (error) return res.status(400).json({ error });
  res.json(data);
});

app.post('/api/complete-job', async (req, res) => {
  const { jobId, actualCompletionDate } = req.body;

  const { data: currentJob, error: currentJobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (currentJobError) return res.status(400).json({ error: currentJobError });

  const scheduledEndDate = new Date(currentJob.start_date);
  scheduledEndDate.setDate(scheduledEndDate.getDate() + currentJob.estimated_days);

  const actualEnd = new Date(actualCompletionDate);
  const delay = (actualEnd - scheduledEndDate) / (1000 * 60 * 60 * 24);

  const { error: updateError } = await supabase
    .from('jobs')
    .update({
      actual_completion_date: actualCompletionDate,
      status: 'complete'
    })
    .eq('id', jobId);

  if (delay > 0) {
    const { data: futureJobs } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', currentJob.user_id)
      .gt('start_date', currentJob.start_date);

    for (let job of futureJobs) {
      const newStart = new Date(job.start_date);
      newStart.setDate(newStart.getDate() + delay);

      await supabase
        .from('jobs')
        .update({ start_date: newStart.toISOString().split('T')[0] })
        .eq('id', job.id);
    }
  }

  res.json({ success: true });
});

app.listen(5000, () => console.log('Server running on port 5000'));
