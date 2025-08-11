const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async () => {
  try {
    const { error } = await supabase.from('pixels').delete().neq('x', null);
    if (error) throw error;
    return { statusCode: 200, body: 'Cleared' };
  } catch (err) {
    console.error('clear error', err);
    return { statusCode: 500, body: 'Error clearing board' };
  }
};
