import Invoices from "./invoices";
import { createClient } from '@/utils/supabase/server'

export default async function InvoicesPage() {
	const supabase = await createClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()
	const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).single()
	const { data: stores } = await supabase.from('stores').select('*')
	return <Invoices user={profile} stores={stores} />
}
