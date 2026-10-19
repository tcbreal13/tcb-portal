import { requireBuilder } from "@/lib/builder";
import { AdminForm } from "@/components/AdminForm";
import { createProject } from "../../p/[id]/manage/actions";

export const metadata = { title: "New project" };

export default async function NewProject() {
  await requireBuilder();
  return (
    <main style={{ marginTop: 22 }}>
      <div><h1>New project</h1><p className="sub">Just the basics now; everything else is filled in from the job&rsquo;s builder tools.</p></div>
      <div className="panel" style={{ maxWidth: 640 }}>
        <AdminForm action={createProject} submit="Create project">
          <label htmlFor="name" style={{ marginTop: 0 }}>Job name</label>
          <input id="name" name="name" type="text" placeholder="Hartwell Residence" required />
          <label htmlFor="address">Address</label>
          <input id="address" name="address" type="text" placeholder="1284 Canyon Road, Los Angeles" />
          <label htmlFor="client_names">Clients (as shown to them)</label>
          <input id="client_names" name="client_names" type="text" placeholder="Dana & Chris Hartwell" />
          <div className="grid2">
            <div><label htmlFor="contract_amount">Original contract (USD)</label><input id="contract_amount" name="contract_amount" type="text" inputMode="decimal" placeholder="4180000" /></div>
            <div><label htmlFor="target_completion">Target completion</label><input id="target_completion" name="target_completion" type="date" /></div>
          </div>
        </AdminForm>
      </div>
    </main>
  );
}
