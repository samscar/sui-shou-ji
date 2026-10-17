import TransferTable from '../components/TransferTable';
import { TransferRecord } from '../types';

interface Props {
  transfers: TransferRecord[];
}

export default function TransferTab({ transfers }: Props) {
  return <TransferTable transfers={transfers} />;
}
