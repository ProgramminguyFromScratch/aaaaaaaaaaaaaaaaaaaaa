import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

export async function handler() {
  const { data, error } = await supabase
    .from('pixels')
    .select('*')

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }

  return { statusCode: 200, body: JSON.stringify(data) }
}
