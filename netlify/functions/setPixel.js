const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  try {
    const { x, y, color } = JSON.parse(event.body);

    // Upsert pixel (insert or update)
    const { error } = await supabase
      .from('pixels')
      .upsert({ x, y, color }, { onConflict: ['x', 'y'] });

    if (error) throw error;
    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('setPixel error', err);
    return { statusCode: 500, body: 'Error setting pixel' };
  }
};
