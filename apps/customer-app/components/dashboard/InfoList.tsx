interface InfoListProps {
  items: [string, string][];
}

export function InfoList({ items }: InfoListProps) {
  return (
    <>
      {items.map(([label, val]) => (
        <div key={label} className="mb-3.5">
          <div className="font-mono text-11 text-ml-cream-dim uppercase tracking-wide mb-1">{label}</div>
          <div className="text-[15px]">{val}</div>
        </div>
      ))}
    </>
  );
}
