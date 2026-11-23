import Image from 'next/image';

const equipmentCategories = [
  { name: 'Backhoe loader', image: '/images/jcb.svg', detail: 'Digging, trenching, and material handling' },
  { name: 'Excavator', image: '/images/excavator.svg', detail: 'Earthworks and site excavation' },
  { name: 'Mobile crane', image: '/images/crane.svg', detail: 'Lifting and positioning heavy loads' },
  { name: 'Wheel loader', image: '/images/loader.svg', detail: 'Loading and moving aggregates' },
  { name: 'Bulldozer', image: '/images/bulldozer.svg', detail: 'Ground clearing and grading' },
  { name: 'Dumper', image: '/images/dumper.svg', detail: 'Moving materials around the site' },
];

export default function EquipmentPage() {
  return (
    <>
      <div className="page-header">
        <div><p className="eyebrow">FLEET & RESOURCES</p><h1>Equipment</h1><p>Equipment categories and illustrative machine references.</p></div>
      </div>
      <div className="local-data-notice">Illustrations only. Equipment inventory and assigned assets are not connected to the API yet.</div>
      <section className="equipment-category-grid" aria-label="Equipment categories">
        {equipmentCategories.map(({ name, image, detail }) => (
          <article className="equipment-category-card" key={name}>
            <Image src={image} alt={`${name} illustration`} width={180} height={112} />
            <div><strong>{name}</strong><span>{detail}</span></div>
          </article>
        ))}
      </section>
    </>
  );
}
