export function SummaryCard({title,value,subtitle}:{title:string;value:string|number;subtitle?:string}){
  return <div className="surface-card p-6"><p className="text-sm font-medium text-muted">{title}</p><p className="mt-3 text-3xl font-bold tabular-nums">{value}</p>{subtitle&&<p className="mt-2 text-sm text-muted">{subtitle}</p>}</div>;
}
