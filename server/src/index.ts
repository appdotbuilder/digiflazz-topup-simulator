import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  createUserInputSchema,
  getUserByIdInputSchema,
  walletDepositInputSchema,
  topUpInputSchema,
  createServiceCategoryInputSchema,
  getProductsByCategoryInputSchema,
  createServiceProductInputSchema,
  getUserTransactionsInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUserById } from './handlers/get_user_by_id';
import { walletDeposit } from './handlers/wallet_deposit';
import { processTopUp } from './handlers/process_topup';
import { getServiceCategories } from './handlers/get_service_categories';
import { createServiceCategory } from './handlers/create_service_category';
import { getProductsByCategory } from './handlers/get_products_by_category';
import { createServiceProduct } from './handlers/create_service_product';
import { getUserTransactions } from './handlers/get_user_transactions';
import { getAllProducts } from './handlers/get_all_products';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUserById: publicProcedure
    .input(getUserByIdInputSchema)
    .query(({ input }) => getUserById(input)),

  // Wallet operations
  walletDeposit: publicProcedure
    .input(walletDepositInputSchema)
    .mutation(({ input }) => walletDeposit(input)),

  // Top-up operations
  processTopUp: publicProcedure
    .input(topUpInputSchema)
    .mutation(({ input }) => processTopUp(input)),

  // Service categories
  getServiceCategories: publicProcedure
    .query(() => getServiceCategories()),

  createServiceCategory: publicProcedure
    .input(createServiceCategoryInputSchema)
    .mutation(({ input }) => createServiceCategory(input)),

  // Service products
  getAllProducts: publicProcedure
    .query(() => getAllProducts()),

  getProductsByCategory: publicProcedure
    .input(getProductsByCategoryInputSchema)
    .query(({ input }) => getProductsByCategory(input)),

  createServiceProduct: publicProcedure
    .input(createServiceProductInputSchema)
    .mutation(({ input }) => createServiceProduct(input)),

  // Transaction history
  getUserTransactions: publicProcedure
    .input(getUserTransactionsInputSchema)
    .query(({ input }) => getUserTransactions(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();