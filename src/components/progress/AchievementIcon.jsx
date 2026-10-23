import { CircleCheck, Compass, Footprints, Trophy } from 'lucide-react';
const icons = { CircleCheck, Compass, Footprints, Trophy };
export default function AchievementIcon({ name, ...props }) {
  const Icon = icons[name] ?? Trophy;
  return <Icon {...props} aria-hidden="true" />;
}
