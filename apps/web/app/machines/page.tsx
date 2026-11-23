import Image from 'next/image';

const machineCategories = [
  { name: 'Backhoe loader', image: '/images/jcb.svg' },
  { name: 'Excavator', image: '/images/excavator.svg' },
  { name: 'Crane', image: '/images/crane.svg' },
  { name: 'Wheel loader', image: '/images/loader.svg' },
  { name: 'Bulldozer', image: '/images/bulldozer.svg' },
  { name: 'Dumper', image: '/images/dumper.svg' },
];

export default function MachinesPage() {
  return (
    <>
      <div className="page-header">
        <div><h1>Machines</h1><p>Fleet management is scheduled for a later development phase.</p></div>
      </div>
      <section className="panel">
        <div className="machine-category-intro">
          <strong>Equipment categories</strong>
          <span>Illustrative thumbnails only — no live fleet records or telemetry are connected.</span>
        </div>
        <div className="machine-category-grid">
          {machineCategories.map(({ name, image }) => (
            <article className="machine-category-card" key={name}>
              <Image src={image} alt={`${name} illustration`} width={180} height={112} />
              <strong>{name}</strong>
            </article>
          ))}
        </div>
        <div className="machine-module-notice">Machine records, GPS data, utilization, and maintenance alerts are not available yet.</div>
      </section>
    </>
  );
}
