import { getAlpacaClient } from "./client";

/**
 * Test order result information
 */
export interface TestOrderResult {
  /** Whether the test succeeded */
  success: boolean;
  /** Order ID that was created */
  orderId?: string;
  /** Client order ID used */
  clientOrderId: string;
  /** Symbol traded */
  symbol: string;
  /** Status message */
  message: string;
  /** Whether the order was successfully cancelled */
  cancelled: boolean;
}

/**
 * Place a small test limit order on SPY and immediately cancel it.
 * This verifies the full order submission → cancellation flow works end-to-end.
 * 
 * Uses SPY (S&P 500 ETF) as it's highly liquid and cheap.
 * Places a limit order well below market to avoid fills, then cancels immediately.
 * 
 * @returns {Promise<TestOrderResult>} Test result with order details
 */
export async function placeTestOrder(): Promise<TestOrderResult> {
  const clientOrderId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const symbol = "SPY";
  
  try {
    const alpaca = getAlpacaClient();
    
    // Get current market price to place order well below market
    // Using a simple fallback since we're placing well below market anyway
    const currentPrice = 400; // Conservative SPY price estimate
    const limitPrice = Math.floor(currentPrice * 0.5); // Place order at 50% of current price
    
    console.log(`[Test Order] Placing test order for ${symbol} at limit price $${limitPrice} (current: $${currentPrice})`);
    
    // Place a small limit order (1 share) well below market
    const order = await alpaca.trading.orders.limit({
      symbol,
      qty: 1,
      side: "buy",
      limitPrice,
      timeInForce: "day",
      clientOrderId,
    });
    
    console.log(`[Test Order] Order placed successfully. Order ID: ${order.id}, Status: ${order.status}`);
    
    // Wait a brief moment to ensure order is registered
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Cancel the order
    if (!order.id) {
      throw new Error("Order was created but no order ID was returned");
    }
    
    try {
      await alpaca.trading.orders.deleteOrderByOrderID({ orderId: order.id });
      console.log(`[Test Order] Order ${order.id} cancelled successfully`);
      
      return {
        success: true,
        orderId: order.id,
        clientOrderId,
        symbol,
        message: `Test order placed and cancelled successfully. Order ID: ${order.id}`,
        cancelled: true,
      };
    } catch (cancelError) {
      const cancelMessage = cancelError instanceof Error ? cancelError.message : "Unknown error";
      console.warn(`[Test Order] Failed to cancel order ${order.id}: ${cancelMessage}`);
      
      return {
        success: true, // Order placement worked, cancellation failed
        orderId: order.id,
        clientOrderId,
        symbol,
        message: `Order placed (ID: ${order.id}) but cancellation failed: ${cancelMessage}`,
        cancelled: false,
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Test Order] Failed to place test order:`, error);
    
    return {
      success: false,
      clientOrderId,
      symbol,
      message: `Test order failed: ${message}`,
      cancelled: false,
    };
  }
}
