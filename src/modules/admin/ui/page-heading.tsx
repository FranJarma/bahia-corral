export function PageHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-5">
      <div>
        <h1 className="editorial text-[29px] leading-[1.15] md:text-[34px]">{title}</h1>
        <p className="mt-3 text-[12px] leading-6 text-muted">{subtitle}</p>
      </div>
      {action}
    </header>
  );
}
