import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { WalletIcon, CreditCardIcon, PhoneIcon, InfoIcon } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { WalletSection } from '@/components/WalletSection';
import { TopUpSection } from '@/components/TopUpSection';
import { TransactionHistory } from '@/components/TransactionHistory';
import type { User, ServiceCategory, ServiceProduct, Transaction } from '../../server/src/schema';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [products, setProducts] = useState<ServiceProduct[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('wallet');

  // Mock user for demo purposes since backend is stub
  const mockUser: User = {
    id: 1,
    email: 'demo@example.com',
    name: 'Demo User',
    phone: '+628123456789',
    wallet_balance: 50000,
    created_at: new Date('2024-01-01'),
    updated_at: new Date()
  };

  // Mock data since backend handlers return empty arrays
  const mockCategories: ServiceCategory[] = [
    {
      id: 1,
      name: 'Pulsa & Paket Data',
      code: 'MOBILE',
      description: 'Top up pulsa dan paket data untuk semua operator',
      is_active: true,
      created_at: new Date('2024-01-01')
    },
    {
      id: 2,
      name: 'PLN Listrik',
      code: 'PLN',
      description: 'Bayar tagihan listrik PLN',
      is_active: true,
      created_at: new Date('2024-01-01')
    },
    {
      id: 3,
      name: 'PDAM Air',
      code: 'PDAM',
      description: 'Bayar tagihan air PDAM',
      is_active: true,
      created_at: new Date('2024-01-01')
    }
  ];

  const mockProducts: ServiceProduct[] = [
    {
      id: 1,
      category_id: 1,
      product_code: 'TSEL_5K',
      name: 'Telkomsel 5.000',
      description: 'Pulsa Telkomsel Rp 5.000',
      price: 6000,
      type: 'prepaid' as const,
      provider: 'Telkomsel',
      is_active: true,
      created_at: new Date('2024-01-01'),
      updated_at: new Date()
    },
    {
      id: 2,
      category_id: 1,
      product_code: 'TSEL_10K',
      name: 'Telkomsel 10.000',
      description: 'Pulsa Telkomsel Rp 10.000',
      price: 11500,
      type: 'prepaid' as const,
      provider: 'Telkomsel',
      is_active: true,
      created_at: new Date('2024-01-01'),
      updated_at: new Date()
    },
    {
      id: 3,
      category_id: 1,
      product_code: 'XL_5K',
      name: 'XL 5.000',
      description: 'Pulsa XL Rp 5.000',
      price: 6200,
      type: 'prepaid' as const,
      provider: 'XL',
      is_active: true,
      created_at: new Date('2024-01-01'),
      updated_at: new Date()
    },
    {
      id: 4,
      category_id: 2,
      product_code: 'PLN_20K',
      name: 'Token PLN 20.000',
      description: 'Token listrik PLN Rp 20.000',
      price: 21000,
      type: 'prepaid' as const,
      provider: 'PLN',
      is_active: true,
      created_at: new Date('2024-01-01'),
      updated_at: new Date()
    }
  ];

  const mockTransactions: Transaction[] = [
    {
      id: 1,
      user_id: 1,
      transaction_type: 'topup' as const,
      amount: 6000,
      status: 'completed' as const,
      payment_method: 'wallet' as const,
      reference_id: 'TXN-001',
      product_id: 1,
      target_number: '08123456789',
      digiflazz_reference: 'DGF-001',
      created_at: new Date('2024-01-10'),
      updated_at: new Date('2024-01-10')
    },
    {
      id: 2,
      user_id: 1,
      transaction_type: 'wallet_deposit' as const,
      amount: 100000,
      status: 'completed' as const,
      payment_method: 'payment_gateway' as const,
      reference_id: 'DEP-001',
      product_id: null,
      target_number: null,
      digiflazz_reference: null,
      created_at: new Date('2024-01-09'),
      updated_at: new Date('2024-01-09')
    }
  ];

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Try to fetch real data, but use mocks if API returns empty
      const [userResult, categoriesResult, productsResult, transactionsResult] = await Promise.all([
        trpc.getUserById.query({ user_id: 1 }).catch(() => null),
        trpc.getServiceCategories.query().catch(() => []),
        trpc.getAllProducts.query().catch(() => []),
        trpc.getUserTransactions.query({ user_id: 1, limit: 10 }).catch(() => [])
      ]);

      // Use mock data since backend returns empty arrays/null
      setUser(userResult || mockUser);
      setCategories(categoriesResult.length > 0 ? categoriesResult : mockCategories);
      setProducts(productsResult.length > 0 ? productsResult : mockProducts);
      setTransactions(transactionsResult.length > 0 ? transactionsResult : mockTransactions);
    } catch (error) {
      console.error('Failed to load data:', error);
      // Fallback to mock data
      setUser(mockUser);
      setCategories(mockCategories);
      setProducts(mockProducts);
      setTransactions(mockTransactions);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleWalletUpdate = useCallback((newBalance: number) => {
    if (user) {
      setUser((prev: User | null) => prev ? { ...prev, wallet_balance: newBalance } : null);
    }
  }, [user]);

  const handleTransactionComplete = useCallback((newTransaction: Transaction) => {
    setTransactions((prev: Transaction[]) => [newTransaction, ...prev]);
    // If it's a top-up transaction, update wallet balance
    if (newTransaction.transaction_type === 'topup' && newTransaction.status === 'completed' && user) {
      const newBalance = user.wallet_balance - newTransaction.amount;
      handleWalletUpdate(newBalance);
    }
  }, [user, handleWalletUpdate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animated-bg">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">💰 TopUp Central</h1>
          <p className="text-xl text-gray-600">Your one-stop solution for digital payments</p>
        </div>

        {/* Demo Notice */}
        <Alert className="mb-6 bg-amber-50 border-amber-200">
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>Demo Mode:</strong> This application is using mock data since the backend handlers are stubs. 
            Real API integration with Digiflazz will be implemented later based on their official documentation.
          </AlertDescription>
        </Alert>

        {/* User Info Card */}
        {user && (
          <Card className="mb-8 glass shadow-xl card-hover">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">👋</span>
                Welcome, {user.name}!
              </CardTitle>
              <CardDescription className="text-indigo-100">
                {user.email} • {user.phone}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WalletIcon className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-gray-600">Wallet Balance</span>
                </div>
                <Badge variant="secondary" className="text-lg font-bold bg-green-100 text-green-800">
                  Rp {user.wallet_balance.toLocaleString('id-ID')}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 glass shadow-md">
            <TabsTrigger value="wallet" className="flex items-center gap-2">
              <WalletIcon className="h-4 w-4" />
              Wallet
            </TabsTrigger>
            <TabsTrigger value="topup" className="flex items-center gap-2">
              <PhoneIcon className="h-4 w-4" />
              Top Up
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <CreditCardIcon className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wallet">
            <WalletSection 
              user={user}
              onWalletUpdate={handleWalletUpdate}
              onTransactionComplete={handleTransactionComplete}
            />
          </TabsContent>

          <TabsContent value="topup">
            <TopUpSection 
              user={user}
              categories={categories}
              products={products}
              onTransactionComplete={handleTransactionComplete}
            />
          </TabsContent>

          <TabsContent value="history">
            <TransactionHistory 
              transactions={transactions}
              products={products}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;