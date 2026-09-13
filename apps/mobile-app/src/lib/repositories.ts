import type {
  IAnnouncementRepository,
  IBranchRepository,
  ICommunityRepository,
  IMembershipRepository,
  IPaymentRepository,
  IPerformanceRepository,
  IProductRepository,
  IUserRepository,
} from '@mucho-loco/customer-core/contract';
import {
  AnnouncementHttpDatasource,
  BranchHttpDatasource,
  CommunityHttpDatasource,
  MembershipHttpDatasource,
  PaymentHttpDatasource,
  PerformanceHttpDatasource,
  ProductHttpDatasource,
  UserHttpDatasource,
} from '@mucho-loco/customer-core/http';
import {
  AnnouncementMockDatasource,
  BranchMockDatasource,
  CommunityMockDatasource,
  MembershipMockDatasource,
  PaymentMockDatasource,
  PerformanceMockDatasource,
  ProductMockDatasource,
  UserMockDatasource,
} from '@mucho-loco/customer-core/mock';
import { api, isHttpDataSource } from './api';

/**
 * El único lugar donde el móvil decide de dónde salen los datos: mocks
 * (default) o `apps/backend`, según `EXPO_PUBLIC_DATA_SOURCE` (ver `api.ts`).
 * Mock y HTTP son los MISMOS datasources que usa customer-app — los dos
 * viven en `@mucho-loco/customer-core`. Las pantallas solo conocen las
 * interfaces del contrato, así que no se enteran de cuál está activo.
 */
const http = isHttpDataSource();

export const announcementRepository: IAnnouncementRepository = http
  ? new AnnouncementHttpDatasource(api)
  : new AnnouncementMockDatasource();
export const branchRepository: IBranchRepository = http ? new BranchHttpDatasource(api) : new BranchMockDatasource();
export const communityRepository: ICommunityRepository = http
  ? new CommunityHttpDatasource(api)
  : new CommunityMockDatasource();
export const membershipRepository: IMembershipRepository = http
  ? new MembershipHttpDatasource(api)
  : new MembershipMockDatasource();
export const paymentRepository: IPaymentRepository = http ? new PaymentHttpDatasource(api) : new PaymentMockDatasource();
export const performanceRepository: IPerformanceRepository = http
  ? new PerformanceHttpDatasource(api)
  : new PerformanceMockDatasource();
export const productRepository: IProductRepository = http ? new ProductHttpDatasource(api) : new ProductMockDatasource();
export const userRepository: IUserRepository = http ? new UserHttpDatasource(api) : new UserMockDatasource();
