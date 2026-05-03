export enum RentalState {
  Created,
  Funded,
  Active,
  Completed,
  Cancelled,
  Disputed,
}

export interface Rental {
  id: bigint;
  landlord: `0x${string}`;
  tenant: `0x${string}`;
  rentAmount: bigint;
  depositAmount: bigint;
  startTimestamp: bigint;
  endTimestamp: bigint;
  state: RentalState;
  ipfsCID: string;
  landlordConfirmed: boolean;
  tenantConfirmed: boolean;
  paymentToken: `0x${string}`;
}

export interface PropertyMetadata {
  name: string;
  description: string;
  imageCID: string;
  images?: string[];
}

type RawRentalState = RentalState | number | bigint;

export interface RawRental {
  id: bigint;
  landlord: `0x${string}`;
  tenant: `0x${string}`;
  rentAmount: bigint;
  depositAmount: bigint;
  startTimestamp: bigint;
  endTimestamp: bigint;
  state: RawRentalState;
  ipfsCID: string;
  landlordConfirmed: boolean;
  tenantConfirmed: boolean;
  paymentToken: `0x${string}`;
}

export function normalizeRental(raw: RawRental): Rental {
  return {
    id: BigInt(raw.id),
    landlord: raw.landlord,
    tenant: raw.tenant,
    rentAmount: BigInt(raw.rentAmount),
    depositAmount: BigInt(raw.depositAmount),
    startTimestamp: BigInt(raw.startTimestamp),
    endTimestamp: BigInt(raw.endTimestamp),
    state: Number(raw.state) as RentalState,
    ipfsCID: raw.ipfsCID,
    landlordConfirmed: raw.landlordConfirmed,
    tenantConfirmed: raw.tenantConfirmed,
    paymentToken: raw.paymentToken,
  };
}
