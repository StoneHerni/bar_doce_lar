'use client';

import { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  CreditCard, 
  Wallet, 
  Smartphone,
  UserPlus
} from 'lucide-react';
import styles from './POS.module.css';

const fmt = (n: number) => Math.round(n).toLocaleString('pt-AO');

interface Product {
  id: number;
  nome: string;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  grade_id?: number | null;
  garrafas_por_grade?: number;
}

interface Customer {
  id: number;
  nome: string;
  limite_credito: number;
}

interface CartItem extends Product {
  quantity: number;
}

import { processSale } from './actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

export default function POSClient({ products, customers, promotions }: { products: Product[], customers: Customer[], promotions?: any[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentType, setPaymentType] = useState('dinheiro');
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const getItemSubtotal = (item: CartItem) => {
    const itemPromos = (promotions || []).filter(p => p.produto_id === item.id).sort((a, b) => b.quantidade_minima - a.quantidade_minima);
    if (itemPromos.length === 0) {
      return item.quantity * item.preco_venda;
    }
    
    let remainingQty = item.quantity;
    let subtotal = 0;
    
    for (const promo of itemPromos) {
      if (remainingQty >= promo.quantidade_minima) {
        const numBundles = Math.floor(remainingQty / promo.quantidade_minima);
        subtotal += numBundles * promo.preco;
        remainingQty = remainingQty % promo.quantidade_minima;
      }
    }
    
    subtotal += remainingQty * item.preco_venda;
    return subtotal;
  };

  const total = cart.reduce((sum, item) => sum + getItemSubtotal(item), 0);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.nome.toLowerCase().includes(search.toLowerCase()));
  }, [products, search]);

  const addToCart = (product: Product) => {
    if (product.estoque_atual <= 0) return;
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.estoque_atual) return prev;
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        if (newQty > item.estoque_atual) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentType === 'fiado' && !selectedCustomer) {
      showToast('Por favor, selecione um cliente para venda fiado.', 'error');
      return;
    }

    const paid = paymentType === 'fiado' ? 0 : (amountPaid > 0 ? amountPaid : total);

    // Mapeia o carrinho com os preços unitários efetivos ponderados promocionalmente
    const cartWithPromoPrices = cart.map(item => ({
      ...item,
      preco_venda: getItemSubtotal(item) / item.quantity
    }));

    setIsProcessing(true);
    const result = await processSale({
      cart: cartWithPromoPrices,
      paymentType,
      customerId: selectedCustomer,
      total,
      amountPaid: paid,
    });

    if (result.success) {
      showToast('Venda realizada com sucesso!', 'success');
      setCart([]);
      setIsCheckoutOpen(false);
      setSelectedCustomer(null);
      setAmountPaid(0);
      router.refresh();
    } else {
      showToast(`Erro: ${result.error}`, 'error');
    }
    setIsProcessing(false);
  };

  return (
    <div className={styles.posContainer}>
      <div className={styles.productsSection}>
        <div className={styles.searchBar}>
          <Search size={20} color="var(--text-secondary)" />
          <input 
            type="text" 
            placeholder="Pesquisar produto..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.productGrid}>
          {filteredProducts.map(product => (
            <button 
              key={product.id} 
              className={`glass-card ${styles.productCard} ${product.estoque_atual <= 0 ? styles.outOfStock : ''}`}
              onClick={() => addToCart(product)}
              disabled={product.estoque_atual <= 0}
            >
              <div className={styles.productInfo}>
                <h4>{product.nome}</h4>
                <p>{fmt(product.preco_venda)} Kz</p>
              </div>
              <div className={styles.stockBadge} style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                <span style={{ fontWeight: 600 }}>{product.estoque_atual} un</span>
                {product.grade_id && product.garrafas_por_grade && product.garrafas_por_grade > 1 && (
                  <span style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: '0.1rem', fontWeight: 400 }}>
                    {Math.floor(product.estoque_atual / product.garrafas_por_grade)} cx + {product.estoque_atual % product.garrafas_por_grade} un
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.cartSection}>
        <div className={`glass-card ${styles.cartCard}`}>
          <div className={styles.cartHeader}>
            <ShoppingCart size={20} />
            <h2>Carrinho</h2>
            <span className={styles.itemCount}>{cart.length} itens</span>
          </div>

          <div className={styles.cartItems}>
            {cart.length === 0 ? (
              <div className={styles.emptyCart}>
                <ShoppingCart size={48} strokeWidth={1} />
                <p>O carrinho está vazio</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className={styles.cartItem}>
                  <div className={styles.itemInfo}>
                    <h5>{item.nome}</h5>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.875rem', textDecoration: getItemSubtotal(item) < item.preco_venda * item.quantity ? 'line-through' : 'none', opacity: getItemSubtotal(item) < item.preco_venda * item.quantity ? 0.5 : 1 }}>
                        {fmt(item.preco_venda * item.quantity)} Kz
                      </span>
                      {getItemSubtotal(item) < item.preco_venda * item.quantity && (
                        <span style={{ color: 'var(--success)', fontSize: '0.75rem', fontWeight: 600 }}>
                          Promoção: {fmt(getItemSubtotal(item))} Kz
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={styles.itemControls}>
                    <button onClick={() => updateQuantity(item.id, -1)}><Minus size={16} /></button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)}><Plus size={16} /></button>
                    <button onClick={() => removeFromCart(item.id)} className={styles.removeBtn}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.cartFooter}>
            <div className={styles.totalRow}>
              <span>Subtotal</span>
              <span>{fmt(total)} Kz</span>
            </div>
            <button 
              className="btn-primary" 
              style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
              disabled={cart.length === 0}
              onClick={() => setIsCheckoutOpen(true)}
            >
              Finalizar Pedido
            </button>
          </div>
        </div>
      </div>

      {isCheckoutOpen && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modal}`}>
            <h2>Finalizar Venda</h2>
            
            <div className={styles.paymentMethods}>
              <button 
                className={`${styles.methodBtn} ${paymentType === 'dinheiro' ? styles.active : ''}`}
                onClick={() => setPaymentType('dinheiro')}
              >
                <Wallet size={20} /> Dinheiro
              </button>
              <button 
                className={`${styles.methodBtn} ${paymentType === 'cartao' ? styles.active : ''}`}
                onClick={() => setPaymentType('cartao')}
              >
                <CreditCard size={20} /> Cartão
              </button>
              <button 
                className={`${styles.methodBtn} ${paymentType === 'express' ? styles.active : ''}`}
                onClick={() => setPaymentType('express')}
              >
                <Smartphone size={20} /> Express
              </button>
              <button 
                className={`${styles.methodBtn} ${paymentType === 'fiado' ? styles.active : ''}`}
                onClick={() => setPaymentType('fiado')}
              >
                <UserPlus size={20} /> Fiado
              </button>
            </div>

            {paymentType === 'fiado' && (
              <div className={styles.customerSelect}>
                <label>Selecionar Cliente *</label>
                <select onChange={(e) => setSelectedCustomer(Number(e.target.value))} value={selectedCustomer ?? ''}>
                  <option value="">Selecione um cliente...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.nome} (Limite: {fmt(c.limite_credito)} Kz)</option>
                  ))}
                </select>
              </div>
            )}

            {paymentType !== 'fiado' && (
              <div className={styles.customerSelect}>
                <label>Associar Cliente (opcional)</label>
                <select onChange={(e) => setSelectedCustomer(e.target.value ? Number(e.target.value) : null)} value={selectedCustomer ?? ''}>
                  <option value="">Consumidor direto</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <div className={styles.customerSelect}>
              <label>Valor Pago (Kz)</label>
              <input
                type="number"
                min={0}
                max={total}
                value={paymentType === 'fiado' ? 0 : (amountPaid || total)}
                disabled={paymentType === 'fiado'}
                onChange={(e) => setAmountPaid(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              {paymentType !== 'fiado' && amountPaid > 0 && amountPaid < total && (
                <small style={{ color: 'var(--warning)', fontSize: '0.75rem' }}>
                  Dívida: {fmt(total - amountPaid)} Kz — será associada ao cliente selecionado
                </small>
              )}
            </div>

            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span>Total a Pagar</span>
                <span className={styles.finalTotal}>{fmt(total)} Kz</span>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className="btn-secondary" onClick={() => setIsCheckoutOpen(false)} disabled={isProcessing}>Cancelar</button>
              <button className="btn-primary" onClick={handleCheckout} disabled={isProcessing}>
                {isProcessing ? 'Processando...' : 'Confirmar Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
