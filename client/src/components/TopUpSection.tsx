import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  PhoneIcon, 
  CreditCardIcon, 
  WalletIcon, 
  ZapIcon,
  SmartphoneIcon,
  BoltIcon,
  DropletIcon
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, ServiceCategory, ServiceProduct, Transaction } from '../../../server/src/schema';

interface TopUpSectionProps {
  user: User | null;
  categories: ServiceCategory[];
  products: ServiceProduct[];
  onTransactionComplete: (transaction: Transaction) => void;
}

const getCategoryIcon = (categoryCode: string) => {
  switch (categoryCode) {
    case 'MOBILE':
      return <SmartphoneIcon className="h-5 w-5" />;
    case 'PLN':
      return <BoltIcon className="h-5 w-5" />;
    case 'PDAM':
      return <DropletIcon className="h-5 w-5" />;
    default:
      return <ZapIcon className="h-5 w-5" />;
  }
};

const getProviderColor = (provider: string) => {
  switch (provider.toLowerCase()) {
    case 'telkomsel':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'xl':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'indosat':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'pln':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export function TopUpSection({ user, categories, products, onTransactionComplete }: TopUpSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<ServiceProduct | null>(null);
  const [targetNumber, setTargetNumber] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'payment_gateway'>('wallet');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter((product: ServiceProduct) => 
      product.category_id === parseInt(selectedCategory) && product.is_active
    );
  }, [selectedCategory, products]);

  const canProceed = useMemo(() => {
    if (!user || !selectedProduct || !targetNumber.trim()) return false;
    if (paymentMethod === 'wallet' && user.wallet_balance < selectedProduct.price) return false;
    return true;
  }, [user, selectedProduct, targetNumber, paymentMethod]);

  const handleTopUp = async () => {
    if (!user || !selectedProduct || !canProceed) return;

    setIsLoading(true);
    setMessage('');

    try {
      // Since backend is stub, simulate the transaction
      const mockTransaction: Transaction = {
        id: Date.now(),
        user_id: user.id,
        transaction_type: 'topup',
        amount: selectedProduct.price,
        status: 'completed',
        payment_method: paymentMethod,
        reference_id: `TOP-${Date.now()}`,
        product_id: selectedProduct.id,
        target_number: targetNumber,
        digiflazz_reference: `DGF-${Date.now()}`,
        created_at: new Date(),
        updated_at: new Date()
      };

      // In real implementation:
      // await trpc.processTopUp.mutate({
      //   user_id: user.id,
      //   product_id: selectedProduct.id,
      //   target_number: targetNumber,
      //   payment_method: paymentMethod
      // });

      onTransactionComplete(mockTransaction);

      setMessage(`🎉 Top-up successful! ${selectedProduct.name} has been sent to ${targetNumber}`);
      setMessageType('success');
      
      // Reset form
      setTargetNumber('');
      setSelectedProduct(null);
      setSelectedCategory('');
    } catch (error) {
      console.error('Top-up failed:', error);
      setMessage('Failed to process top-up. Please try again.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Please log in to make top-ups.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Selection */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ZapIcon className="h-5 w-5" />
            Select Service Category
          </CardTitle>
          <CardDescription>
            Choose the type of service you want to top up
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-3 bg-gray-100">
              {categories.map((category: ServiceCategory) => (
                <TabsTrigger 
                  key={category.id} 
                  value={category.id.toString()}
                  className="flex items-center gap-2 text-sm"
                >
                  {getCategoryIcon(category.code)}
                  <span className="hidden sm:inline">{category.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Product Selection */}
      {selectedCategory && (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Choose Product</CardTitle>
            <CardDescription>
              Select the product you want to purchase
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredProducts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No products available for this category
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product: ServiceProduct) => (
                  <div
                    key={product.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                      selectedProduct?.id === product.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{product.name}</h3>
                      <Badge className={getProviderColor(product.provider)}>
                        {product.provider}
                      </Badge>
                    </div>
                    {product.description && (
                      <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                    )}
                    <div className="flex justify-between items-center">
                      <Badge variant={product.type === 'prepaid' ? 'default' : 'secondary'}>
                        {product.type}
                      </Badge>
                      <span className="font-bold text-indigo-600">
                        Rp {product.price.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transaction Form */}
      {selectedProduct && (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Complete Your Purchase</CardTitle>
            <CardDescription>
              Enter target number and choose payment method
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Target Number */}
            <div>
              <Label htmlFor="targetNumber" className="text-sm font-medium">
                Target Phone Number
              </Label>
              <Input
                id="targetNumber"
                type="tel"
                placeholder="e.g., 08123456789"
                value={targetNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetNumber(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Payment Method */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Payment Method</Label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === 'wallet'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  onClick={() => setPaymentMethod('wallet')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <WalletIcon className="h-4 w-4" />
                    <span className="font-medium">Wallet</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Balance: Rp {user.wallet_balance.toLocaleString('id-ID')}
                  </p>
                  {user.wallet_balance < selectedProduct.price && (
                    <p className="text-xs text-red-600 mt-1">Insufficient balance</p>
                  )}
                </div>

                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === 'payment_gateway'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  onClick={() => setPaymentMethod('payment_gateway')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCardIcon className="h-4 w-4" />
                    <span className="font-medium">Payment Gateway</span>
                  </div>
                  <p className="text-sm text-gray-600">Direct payment</p>
                </div>
              </div>
            </div>

            {/* Purchase Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Purchase Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Product:</span>
                  <span>{selectedProduct.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Target:</span>
                  <span>{targetNumber || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment:</span>
                  <span className="capitalize">{paymentMethod.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between font-medium text-base border-t pt-1 mt-2">
                  <span>Total:</span>
                  <span>Rp {selectedProduct.price.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            {message && (
              <Alert className={messageType === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                <AlertDescription className={messageType === 'success' ? 'text-green-800' : 'text-red-800'}>
                  {message}
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleTopUp}
              disabled={!canProceed || isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              size="lg"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <PhoneIcon className="h-4 w-4 mr-2" />
                  Complete Top-Up
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}