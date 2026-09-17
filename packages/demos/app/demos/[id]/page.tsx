import { notFound } from 'next/navigation';
import { Arcade } from '../../../components/arcade';
import { catalog } from '../../../lib/catalog';
export default async function DemoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const demo = catalog.find(d => d.id === id);
  if (!demo) notFound();
  return <Arcade only={demo.id} />;
}
