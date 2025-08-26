import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlusCircleIcon, CreditCardIcon, WalletIcon, CheckCircleIcon } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, Transaction } from '../../../server/src/schema';

interface WalletSectionProps {
  user: User | null;
  onWalletUpdate: (newBalance: number) => void;
  onTransactionComplete: (transaction: Transaction) => void;
}

export function WalletSection({ user, onWalletUpdate, onTransactionComplete }: WalletSectionProps) {
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const presetAmounts = [50000, 100000, 200000, 500000];

  const handleDeposit = async () => {
    if (!user || !amount) return;

    const depositAmount = parseFloat(amount);
    if (depositAmount <= 0 || isNaN(depositAmount)) {
      setMessage('Please enter a valid amount');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // Since backend is stub, simulate the transaction
      const mockTransaction: Transaction = {
        id: Date.now(), // Simple ID generation for demo
        user_id: user.id,
        transaction_type: 'wallet_deposit',
        amount: depositAmount,
        status: 'completed',
        payment_method: 'payment_gateway',
        reference_id: `DEP-${Date.now()}`,
        product_id: null,
        target_number: null,
        digiflazz_reference: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      // In real implementation, this would call the actual API
      // await trpc.walletDeposit.mutate({
      //   user_id: user.id,
      //   amount: depositAmount,
      //   payment_method: 'payment_gateway'
      // });

      // Update wallet balance and add transaction
      const newBalance = user.wallet_balance + depositAmount;
      onWalletUpdate(newBalance);
      onTransactionComplete(mockTransaction);

      setMessage(`Successfully deposited Rp ${depositAmount.toLocaleString('id-ID')} to your wallet!`);
      setMessageType('success');
      setAmount('');
    } catch (error) {
      console.error('Deposit failed:', error);
      setMessage('Failed to process deposit. Please try again.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Please log in to access your wallet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Wallet Balance Card */}
      <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <WalletIcon className="h-6 w-6" />
            Your Wallet Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold mb-2">
            Rp {user.wallet_balance.toLocaleString('id-ID')}
          </div>
          <div className="flex items-center gap-2 text-green-100">
            <CheckCircleIcon className="h-4 w-4" />
            <span className="text-sm">Ready for transactions</span>
          </div>
        </CardContent>
      </Card>

      {/* Deposit Form Card */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <PlusCircleIcon className="h-5 w-5" />
            Add Funds
          </CardTitle>
          <CardDescription>
            Deposit money to your wallet for seamless transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
              Amount (IDR)
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
              className="mt-1"
              min="1000"
              step="1000"
            />
          </div>

          {/* Preset Amount Buttons */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Quick Select
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {presetAmounts.map((presetAmount) => (
                <Button
                  key={presetAmount}
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(presetAmount.toString())}
                  className="text-sm"
                >
                  Rp {presetAmount.toLocaleString('id-ID')}
                </Button>
              ))}
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
            onClick={handleDeposit}
            disabled={isLoading || !amount}
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
                <CreditCardIcon className="h-4 w-4 mr-2" />
                Deposit via Payment Gateway
              </>
            )}
          </Button>

          <div className="text-xs text-gray-500 text-center">
            <p className="mb-1">💳 Supported payment methods:</p>
            <div className="flex items-center justify-center gap-4">
              <Badge variant="outline" className="text-xs">Credit Card</Badge>
              <Badge variant="outline" className="text-xs">Bank Transfer</Badge>
              <Badge variant="outline" className="text-xs">E-Wallet</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}