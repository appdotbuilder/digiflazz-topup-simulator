import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  HistoryIcon, 
  ArrowUpIcon, 
  ArrowDownIcon, 
  PhoneIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon
} from 'lucide-react';
import type { Transaction, ServiceProduct } from '../../../server/src/schema';

interface TransactionHistoryProps {
  transactions: Transaction[];
  products: ServiceProduct[];
}

const getStatusIcon = (status: Transaction['status']) => {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
    case 'pending':
      return <ClockIcon className="h-4 w-4 text-yellow-600" />;
    case 'failed':
      return <XCircleIcon className="h-4 w-4 text-red-600" />;
    case 'cancelled':
      return <AlertCircleIcon className="h-4 w-4 text-gray-600" />;
    default:
      return <ClockIcon className="h-4 w-4 text-gray-600" />;
  }
};

const getStatusColor = (status: Transaction['status']) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getTransactionIcon = (type: Transaction['transaction_type']) => {
  switch (type) {
    case 'wallet_deposit':
      return <ArrowDownIcon className="h-4 w-4 text-green-600" />;
    case 'wallet_withdrawal':
      return <ArrowUpIcon className="h-4 w-4 text-red-600" />;
    case 'topup':
      return <PhoneIcon className="h-4 w-4 text-blue-600" />;
    default:
      return <HistoryIcon className="h-4 w-4 text-gray-600" />;
  }
};

const formatTransactionType = (type: Transaction['transaction_type']) => {
  switch (type) {
    case 'wallet_deposit':
      return 'Wallet Deposit';
    case 'wallet_withdrawal':
      return 'Wallet Withdrawal';
    case 'topup':
      return 'Top Up';
    default:
      return type;
  }
};

export function TransactionHistory({ transactions, products }: TransactionHistoryProps) {
  const groupedTransactions = useMemo(() => {
    const all = transactions;
    const deposits = transactions.filter((t: Transaction) => t.transaction_type === 'wallet_deposit');
    const topups = transactions.filter((t: Transaction) => t.transaction_type === 'topup');
    const withdrawals = transactions.filter((t: Transaction) => t.transaction_type === 'wallet_withdrawal');
    
    return { all, deposits, topups, withdrawals };
  }, [transactions]);

  const getProductName = (productId: number | null) => {
    if (!productId) return null;
    const product = products.find((p: ServiceProduct) => p.id === productId);
    return product?.name || `Product #${productId}`;
  };

  const renderTransactionCard = (transaction: Transaction) => (
    <Card key={transaction.id} className="bg-white border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              {getTransactionIcon(transaction.transaction_type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-gray-900">
                  {formatTransactionType(transaction.transaction_type)}
                </h3>
                <Badge className={getStatusColor(transaction.status)}>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(transaction.status)}
                    <span className="capitalize">{transaction.status}</span>
                  </div>
                </Badge>
              </div>
              
              <div className="space-y-1 text-sm text-gray-600">
                {transaction.product_id && (
                  <p>Product: {getProductName(transaction.product_id)}</p>
                )}
                {transaction.target_number && (
                  <p>Target: {transaction.target_number}</p>
                )}
                {transaction.reference_id && (
                  <p>Reference: {transaction.reference_id}</p>
                )}
                {transaction.digiflazz_reference && (
                  <p>Digiflazz ID: {transaction.digiflazz_reference}</p>
                )}
                <p className="flex items-center gap-1">
                  <ClockIcon className="h-3 w-3" />
                  {transaction.created_at.toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className={`font-bold ${
              transaction.transaction_type === 'wallet_deposit' 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {transaction.transaction_type === 'wallet_deposit' ? '+' : '-'}
              Rp {transaction.amount.toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-gray-500 capitalize">
              via {transaction.payment_method.replace('_', ' ')}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HistoryIcon className="h-5 w-5" />
          Transaction History
        </CardTitle>
        <CardDescription>
          View all your recent transactions and their status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100">
            <TabsTrigger value="all" className="text-sm">
              All ({groupedTransactions.all.length})
            </TabsTrigger>
            <TabsTrigger value="deposits" className="text-sm">
              Deposits ({groupedTransactions.deposits.length})
            </TabsTrigger>
            <TabsTrigger value="topups" className="text-sm">
              Top Ups ({groupedTransactions.topups.length})
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="text-sm">
              Withdrawals ({groupedTransactions.withdrawals.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3">
            {groupedTransactions.all.length === 0 ? (
              <div className="text-center py-8">
                <HistoryIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No transactions yet</p>
                <p className="text-sm text-gray-400">Your transaction history will appear here</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {groupedTransactions.all.map(renderTransactionCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="deposits" className="space-y-3">
            {groupedTransactions.deposits.length === 0 ? (
              <div className="text-center py-8">
                <ArrowDownIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No wallet deposits yet</p>
                <p className="text-sm text-gray-400">Add funds to your wallet to get started</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {groupedTransactions.deposits.map(renderTransactionCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="topups" className="space-y-3">
            {groupedTransactions.topups.length === 0 ? (
              <div className="text-center py-8">
                <PhoneIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No top-ups yet</p>
                <p className="text-sm text-gray-400">Purchase your first top-up service</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {groupedTransactions.topups.map(renderTransactionCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-3">
            {groupedTransactions.withdrawals.length === 0 ? (
              <div className="text-center py-8">
                <ArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No withdrawals yet</p>
                <p className="text-sm text-gray-400">Withdrawal history will appear here</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {groupedTransactions.withdrawals.map(renderTransactionCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}