export const initializeProcessors = () => {
  console.log('⚠️ Queue disabled');
};

export const scheduleRecurringJobs = () => {
  console.log('⚠️ Recurring jobs disabled');
};

export const getQueueStatus = async () => {
  return { enabled: false, message: 'Redis disabled' };
};

export default {};
