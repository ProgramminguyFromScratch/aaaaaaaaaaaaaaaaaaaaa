const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async () => {
  try {
    const { data, error } = await supabase
      .from('pixels')
      .select('*');

    if (error) throw error;
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('getBoard error', err);
    return { statusCode: 500, body: 'Error fetching board' };
  }
};
