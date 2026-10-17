import RefundTable from '../components/RefundTable';
import { RefundMatch } from '../types';

interface Props {
  matches: RefundMatch[];
  ignoredKeys: Set<string>;
  onToggle: (key: string) => void;
}

export default function RefundTab({ matches, ignoredKeys, onToggle }: Props) {
  return <RefundTable matches={matches} ignoredKeys={ignoredKeys} onToggle={onToggle} />;
}
