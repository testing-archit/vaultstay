import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import {
  useFundRental,
  useActivateRental,
  useConfirmCompletion,
  useCancelRental,
  useRaiseDispute,
  useAutoResolveTimeout,
} from "../hooks/useVaultStay";
import { formatEther, erc20Abi } from "viem";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import type { Rental } from "../lib/types";
import { Loader2, AlertCircle } from "lucide-react";
import { createClient, normalizeAddress } from "../lib/supabase";
import { CONTRACT_ADDRESS } from "../lib/constants";

interface ActionPanelProps {
  rental: Rental;
  onTxSuccess?: () => void;
}

/** Maps a state transition to a rental_events event_type */
const STATE_TO_EVENT: Record<number, string> = {
  1: "Funded",
  2: "Activated",
  3: "Completed",
  4: "Cancelled",
  5: "Disputed",
};

export function ActionPanel({ rental, onTxSuccess }: ActionPanelProps) {
  const { address } = useAccount();
  const { fund, isConfirming: isFunding, isConfirmed: fundConfirmed, hash: fundHash } = useFundRental();
  const { activate, isConfirming: isActivating, isConfirmed: activateConfirmed, hash: activateHash } = useActivateRental();
  const { confirm, isConfirming: isConfirmingCompletion, isConfirmed: confirmConfirmed, hash: confirmHash } = useConfirmCompletion();
  const { cancel, isConfirming: isCancelling, isConfirmed: cancelConfirmed, hash: cancelHash } = useCancelRental();
  const { dispute, isConfirming: isDisputing, isConfirmed: disputeConfirmed, hash: disputeHash } = useRaiseDispute();
  const { autoResolve, isConfirming: isAutoResolving, isConfirmed: autoResolveConfirmed, hash: autoResolveHash } = useAutoResolveTimeout();

  const { writeContractAsync: approveAsync, hash: approveHash, isPending: isApproving } = useWriteContract();
  const { isLoading: isConfirmingApprove } = useWaitForTransactionReceipt({ hash: approveHash });

  const [txError, setTxError] = useState<string | null>(null);
  const [txPending, setTxPending] = useState(false);

  const handleTx = async (txFn: () => Promise<unknown>) => {
    setTxError(null);
    setTxPending(true);
    try {
      await txFn();
    } catch (err) {
      // Extract human-readable revert reason from deeply nested wagmi/viem error
      const anyErr = err as Record<string, unknown>;
      const cause = anyErr.cause as Record<string, unknown> | undefined;
      const innerCause = cause?.cause as Record<string, unknown> | undefined;
      const reason =
        (innerCause?.reason as string) ||
        (cause?.reason as string) ||
        (anyErr.shortMessage as string) ||
        (anyErr.message as string) ||
        "Transaction failed";
      setTxError(String(reason).slice(0, 250));
    } finally {
      setTxPending(false);
    }
  };

  /**
   * After any transaction confirms on-chain:
   * 1. Call onTxSuccess() so the parent page refetches the listing
   * 2. Log the event to Supabase rental_events for activity tracking
   */
  const syncEvent = async (
    hash: `0x${string}` | undefined,
    eventType: string
  ) => {
    if (!hash || !address) return;
    const supabase = createClient();
    await supabase.from("rental_events").insert({
      rental_id: Number(rental.id),
      event_type: eventType,
      actor_addr: normalizeAddress(address),
      tx_hash: hash.toLowerCase(),
    });
    onTxSuccess?.();
  };

  useEffect(() => { if (fundConfirmed) syncEvent(fundHash, STATE_TO_EVENT[1]); }, [fundConfirmed]);
  useEffect(() => { if (activateConfirmed) syncEvent(activateHash, STATE_TO_EVENT[2]); }, [activateConfirmed]);
  useEffect(() => { if (confirmConfirmed) syncEvent(confirmHash, STATE_TO_EVENT[3]); }, [confirmConfirmed]);
  useEffect(() => { if (cancelConfirmed) syncEvent(cancelHash, STATE_TO_EVENT[4]); }, [cancelConfirmed]);
  useEffect(() => { if (disputeConfirmed) syncEvent(disputeHash, STATE_TO_EVENT[5]); }, [disputeConfirmed]);
  useEffect(() => { if (autoResolveConfirmed) syncEvent(autoResolveHash, STATE_TO_EVENT[3]); }, [autoResolveConfirmed]);

  if (!address) {
    return (
      <div className="p-6 border-t border-border text-center">
        <p className="text-muted text-sm">Connect your wallet to interact with this rental.</p>
      </div>
    );
  }

  const isLandlord = rental.landlord.toLowerCase() === address.toLowerCase();
  const isTenant =
    rental.tenant !== "0x0000000000000000000000000000000000000000" &&
    rental.tenant.toLowerCase() === address.toLowerCase();
  const isNobody = !isLandlord && !isTenant;
  const state = rental.state;

  const totalWei = rental.rentAmount + rental.depositAmount;
  const totalEth = formatEther(totalWei);
  const isERC20 = rental.paymentToken !== "0x0000000000000000000000000000000000000000";
  const tokenSymbol = isERC20
    ? (rental.paymentToken.toLowerCase() === "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238" ? "USDC" : "DAI")
    : "ETH";

  const { data: allowance } = useReadContract({
    address: isERC20 ? rental.paymentToken : undefined,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && isERC20 ? [address, CONTRACT_ADDRESS] : undefined,
    query: { enabled: isERC20 && !!address },
  });
  const needsApproval = isERC20 && (allowance ?? 0n) < totalWei;
  
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const isEarlyToActivate = now < Number(rental.startTimestamp);
  const secondsUntilStart = Math.max(0, Number(rental.startTimestamp) - now);
  const isPastAutoResolve = now > Number(rental.endTimestamp) + 7 * 86400;

  const isAnyPending =
    isFunding ||
    isActivating ||
    isConfirmingCompletion ||
    isCancelling ||
    isDisputing ||
    isAutoResolving ||
    isApproving ||
    isConfirmingApprove ||
    txPending;

  return (
    <div className="p-6 border-t border-border flex flex-col space-y-4">
      {/* Error Banner */}
      {txError && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span className="break-words">{txError}</span>
        </div>
      )}

      {/* Loading indicator */}
      {isAnyPending && (
        <div className="flex items-center justify-center gap-2 py-2 text-accent text-sm">
          <Loader2 size={16} className="animate-spin" />
          <span>Transaction pending on-chain...</span>
        </div>
      )}

      {/* STATE 0: CREATED */}
      {state === 0 && !isAnyPending && (
        <>
          {!isLandlord && (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted">
                Total Required: <span className="text-text font-mono font-bold">{totalEth} {tokenSymbol}</span> (Rent + Deposit)
              </p>
              {needsApproval ? (
                <button
                  onClick={() => handleTx(async () => {
                    await approveAsync({
                      address: rental.paymentToken,
                      abi: erc20Abi,
                      functionName: "approve",
                      args: [CONTRACT_ADDRESS, totalWei],
                    });
                  })}
                  disabled={isApproving || isConfirmingApprove}
                  className="btn-primary w-full py-3.5 flex items-center justify-center gap-2"
                >
                  🔒 Approve {tokenSymbol} to Fund Escrow
                </button>
              ) : (
                <button
                  onClick={() => handleTx(() => fund(rental.id, isERC20 ? "0" : totalEth))}
                  disabled={isFunding}
                  className="btn-primary w-full py-3.5 flex items-center justify-center gap-2"
                >
                  💰 Fund Escrow & Book Property
                </button>
              )}
            </div>
          )}
          {isLandlord && (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted">Waiting for a tenant to fund the escrow.</p>
              <button
                onClick={() => handleTx(() => cancel(rental.id))}
                disabled={isCancelling}
                className="btn-danger w-full py-3"
              >
                Cancel Listing
              </button>
            </div>
          )}
        </>
      )}

      {/* STATE 1: FUNDED */}
      {state === 1 && !isAnyPending && (
        <>
          {isLandlord && (
            <div className="text-center space-y-3">
              <p className="text-sm text-accent2 font-medium">
                ✅ Escrow Funded! Activate when tenant is ready to check in.
              </p>
              {isEarlyToActivate ? (
                <div className="w-full py-3.5 bg-surface border border-border rounded-xl flex flex-col items-center gap-1">
                  <span className="text-xs text-muted font-medium">⏳ Activation unlocks in</span>
                  <span className="font-mono text-lg font-bold text-accent tabular-nums">
                    {String(Math.floor(secondsUntilStart / 60)).padStart(2, '0')}:{String(secondsUntilStart % 60).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-muted">(start time has not been reached yet)</span>
                </div>
              ) : (
                <button
                  onClick={() => handleTx(() => activate(rental.id))}
                  disabled={isActivating}
                  className="w-full py-3.5 bg-accent2 hover:bg-accent2/90 text-background font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(0,212,170,0.3)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🔑 Activate Rental
                </button>
              )}
              <button
                onClick={() => handleTx(() => cancel(rental.id))}
                disabled={isCancelling}
                className="btn-danger w-full py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel & Refund Tenant
              </button>
            </div>
          )}
          {isTenant && (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted">You have funded the escrow. Waiting for landlord to activate.</p>
              <button
                onClick={() => handleTx(() => cancel(rental.id))}
                disabled={isCancelling}
                className="btn-danger w-full py-3"
              >
                Cancel & Get Refund
              </button>
            </div>
          )}
          {isNobody && (
            <p className="text-sm text-center text-muted">This rental has been booked and is awaiting activation.</p>
          )}
        </>
      )}

      {/* STATE 2: ACTIVE */}
      {state === 2 && (isLandlord || isTenant) && !isAnyPending && (
        <div className="space-y-3">
          <p className="text-sm text-center text-muted">
            Rental is active. Both parties must confirm completion to release funds.
          </p>

          {(rental.landlordConfirmed || rental.tenantConfirmed) && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs text-warning text-center">
              ⏳ Waiting for the other party to confirm to release payout.
              {rental.landlordConfirmed && " (Landlord confirmed)"}
              {rental.tenantConfirmed && " (Tenant confirmed)"}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => handleTx(() => confirm(rental.id))}
              disabled={
                isConfirmingCompletion ||
                (isLandlord && rental.landlordConfirmed) ||
                (isTenant && rental.tenantConfirmed)
              }
              className="btn-success flex-1 py-3 flex items-center justify-center gap-1.5 text-sm"
            >
              {(isLandlord && rental.landlordConfirmed) || (isTenant && rental.tenantConfirmed)
                ? "✓ Confirmed"
                : "Confirm Completion"}
            </button>
            <button
              onClick={() => handleTx(() => dispute(rental.id))}
              disabled={isDisputing}
              className="flex-1 py-3 border border-warning text-warning hover:bg-warning/10 font-bold rounded-xl transition-all text-sm disabled:opacity-50"
            >
              ⚖️ Raise Dispute
            </button>
          </div>

          {isPastAutoResolve && (
            <button
              onClick={() => handleTx(() => autoResolve(rental.id))}
              disabled={isAutoResolving}
              className="mt-2 w-full py-3 bg-accent/20 border border-accent/30 text-accent font-bold rounded-xl transition-all text-sm disabled:opacity-50"
            >
              ⏱️ Force Auto-Resolve (7-day timeout reached)
            </button>
          )}
        </div>
      )}

      {state === 2 && isNobody && !isAnyPending && (
        <div className="space-y-3">
          <p className="text-sm text-center text-muted">This rental is currently active.</p>
          {isPastAutoResolve && (
            <button
              onClick={() => handleTx(() => autoResolve(rental.id))}
              disabled={isAutoResolving}
              className="w-full py-3 bg-accent/20 border border-accent/30 text-accent font-bold rounded-xl transition-all text-sm disabled:opacity-50"
            >
              ⏱️ Force Auto-Resolve (7-day timeout reached)
            </button>
          )}
        </div>
      )}

      {/* STATES 3, 4, 5: Terminal — show payout summary */}
      {state >= 3 && !isAnyPending && (
        <div className="text-center py-2 space-y-3">
          {state === 3 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-left space-y-2">
              <p className="text-xs font-bold text-green-400 uppercase tracking-widest">✅ Escrow Completed</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Landlord received</span>
                <span className="font-mono font-bold text-green-400">{formatEther(rental.rentAmount)} ETH</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Tenant deposit returned</span>
                <span className="font-mono font-bold text-accent2">{formatEther(rental.depositAmount)} ETH</span>
              </div>
              <p className="text-[10px] text-muted pt-1">Funds released via pull-payment — withdraw from Dashboard.</p>
            </div>
          )}
          {state === 4 && (
            <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 text-left space-y-2">
              <p className="text-xs font-bold text-danger uppercase tracking-widest">🚫 Rental Cancelled</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Tenant refunded</span>
                <span className="font-mono font-bold text-danger">{formatEther(rental.rentAmount + rental.depositAmount)} ETH</span>
              </div>
              <p className="text-[10px] text-muted pt-1">Full rent + deposit returned to tenant.</p>
            </div>
          )}
          {state === 5 && (
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 text-left space-y-2">
              <p className="text-xs font-bold text-warning uppercase tracking-widest">⚖️ Dispute In Progress</p>
              <p className="text-sm text-muted">This rental has been flagged for arbitration. Funds remain locked pending resolution.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
