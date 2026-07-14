import { Icon } from "@iconify/react";

export function Cart() {
  return (
    <div className="flex flex-col w-full h-full min-h-screen bg-background pb-20 font-sans">
      <div className="bg-primary px-4 pt-4 pb-6">
        <div className="flex items-center justify-between">
          <button className="text-white">
            <Icon icon="solar:arrow-left-linear" className="size-6" />
          </button>
          <h1 className="text-white text-lg font-bold font-heading">Shopping Cart</h1>
          <button className="text-white">
            <Icon icon="solar:menu-dots-bold" className="size-6" />
          </button>
        </div>
      </div>
      <div className="flex-1 px-4 mt-4">
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-3">
            <input
              type="checkbox"
              className="size-5 rounded border-2 border-border accent-primary"
            />
            <span className="text-sm font-medium text-foreground">Select All</span>
            <span className="text-xs text-muted-foreground">(3 items)</span>
          </div>
        </div>
        <div className="flex flex-col gap-4 mb-6">
          <div className="bg-card rounded-xl p-4 border border-border/50 shadow-sm">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                className="size-5 rounded border-2 border-border accent-primary mt-1"
              />
              <div className="size-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                <img
                  alt="Nike Shoe"
                  src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-1">
                  Nike Air Zoom Pegasus 39 Running Shoe
                </h4>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted-foreground">Size: 42</span>
                  <span className="text-xs text-muted-foreground">Color: Black</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-primary">$120</span>
                  <div className="flex items-center gap-3">
                    <button className="text-muted-foreground size-6 flex items-center justify-center border border-border rounded">
                      <Icon icon="solar:minus-circle-linear" className="size-4" />
                    </button>
                    <span className="text-sm font-medium">1</span>
                    <button className="text-primary size-6 flex items-center justify-center border border-primary rounded">
                      <Icon icon="solar:add-circle-bold" className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border/50 shadow-sm">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                className="size-5 rounded border-2 border-border accent-primary mt-1"
              />
              <div className="size-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                <img
                  alt="Black T-shirt"
                  src="https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&q=80"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-1">
                  Essential Cotton Crew Neck T-Shirt Black
                </h4>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted-foreground">Size: L</span>
                  <span className="text-xs text-muted-foreground">Color: Black</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-primary">$25</span>
                  <div className="flex items-center gap-3">
                    <button className="text-muted-foreground size-6 flex items-center justify-center border border-border rounded">
                      <Icon icon="solar:minus-circle-linear" className="size-4" />
                    </button>
                    <span className="text-sm font-medium">2</span>
                    <button className="text-primary size-6 flex items-center justify-center border border-primary rounded">
                      <Icon icon="solar:add-circle-bold" className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border/50 shadow-sm">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                className="size-5 rounded border-2 border-border accent-primary mt-1"
              />
              <div className="size-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                <img
                  alt="Backpack"
                  src="https://images.unsplash.com/photo-1591561954557-26941169b49e?w=400&q=80"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-1">
                  Urban Explorer Waterproof Backpack
                </h4>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted-foreground">Color: Navy</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-primary">$89</span>
                  <div className="flex items-center gap-3">
                    <button className="text-muted-foreground size-6 flex items-center justify-center border border-border rounded">
                      <Icon icon="solar:minus-circle-linear" className="size-4" />
                    </button>
                    <span className="text-sm font-medium">1</span>
                    <button className="text-primary size-6 flex items-center justify-center border border-primary rounded">
                      <Icon icon="solar:add-circle-bold" className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border/50 shadow-sm mb-4">
          <h3 className="text-sm font-bold text-foreground mb-3 font-heading">
            Recommended for you
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col">
              <div className="aspect-square rounded-lg bg-muted overflow-hidden mb-2">
                <img
                  alt="Sunglasses"
                  src="https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&q=80"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xs font-medium text-foreground line-clamp-2 mb-1">
                Classic Aviator Sunglasses
              </span>
              <span className="text-sm font-bold text-primary">$145</span>
            </div>
            <div className="flex flex-col">
              <div className="aspect-square rounded-lg bg-muted overflow-hidden mb-2">
                <img
                  alt="Sneakers"
                  src="https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&q=80"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xs font-medium text-foreground line-clamp-2 mb-1">
                White Leather Sneakers
              </span>
              <span className="text-sm font-bold text-primary">$95</span>
            </div>
            <div className="flex flex-col">
              <div className="aspect-square rounded-lg bg-muted overflow-hidden mb-2">
                <img
                  alt="Watch"
                  src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xs font-medium text-foreground line-clamp-2 mb-1">
                Minimalist Watch Silver
              </span>
              <span className="text-sm font-bold text-primary">$199</span>
            </div>
          </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Total:</span>
            <span className="text-xl font-bold text-primary">$259</span>
          </div>
          <button className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-bold text-sm shadow-lg">
            Checkout (3)
          </button>
        </div>
        <div className="bg-background border-t border-border flex justify-around items-center py-2 pb-5">
          <div className="flex flex-col items-center gap-1">
            <div className="text-muted-foreground">
              <Icon icon="solar:home-2-bold" className="size-6" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">Front page</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-muted-foreground">
              <Icon icon="solar:widget-bold" className="size-6" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">Classification</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-primary">
              <Icon icon="solar:cart-large-bold" className="size-6" />
            </div>
            <span className="text-[10px] font-medium text-primary">Cart</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-muted-foreground">
              <Icon icon="solar:user-circle-linear" className="size-6" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">Mine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
