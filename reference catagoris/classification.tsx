import { Icon } from "@iconify/react";

export function Classification() {
  return (
    <div className="flex flex-col w-full h-full min-h-screen bg-background font-sans">
      <div className="bg-primary px-4 pt-4 pb-14 rounded-b-[2rem] relative z-0 shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-white font-heading">Categories</h1>
          <button className="bg-[#0D47A1] text-white text-xs font-semibold px-4 py-1.5 rounded-md">
            Log in
          </button>
        </div>
        <div className="absolute left-4 right-4 -bottom-6 z-10">
          <div className="bg-card rounded-xl shadow-lg p-3 flex items-center gap-3">
            <div className="flex-1 flex items-center bg-input rounded-lg px-3 py-2 gap-2 border border-border/50">
              <Icon icon="solar:magnifer-linear" className="text-muted-foreground size-5" />
              <input
                type="text"
                className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/70"
                placeholder="Search products, brands..."
              />
            </div>
            <button className="p-1">
              <Icon icon="solar:cart-large-2-linear" className="size-6 text-foreground" />
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-1 mt-10 overflow-hidden">
        <div className="w-24 bg-card border-r border-border overflow-y-auto pb-24 scrollbar-hide">
          <div className="flex flex-col items-center py-4 gap-6">
            <div className="flex flex-col items-center gap-1.5 w-full relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
              <div className="size-12 rounded-full bg-[#E3F2FD] flex items-center justify-center text-primary">
                <Icon icon="solar:gift-bold" className="size-6" />
              </div>
              <span className="text-[10px] text-center text-primary font-bold">Lifestyle</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground/80">
                <Icon icon="mdi:shoe-formal" className="size-6" />
              </div>
              <span className="text-[10px] text-center text-muted-foreground font-medium px-1">
                Men Shoes
              </span>
            </div>
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground/80">
                <Icon icon="mdi:shoe-heel" className="size-6" />
              </div>
              <span className="text-[10px] text-center text-muted-foreground font-medium px-1">
                Women Shoes
              </span>
            </div>
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground/80">
                <Icon icon="solar:glasses-bold" className="size-6" />
              </div>
              <span className="text-[10px] text-center text-muted-foreground font-medium px-1">
                Accessories
              </span>
            </div>
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground/80">
                <Icon icon="solar:t-shirt-bold" className="size-6" />
              </div>
              <span className="text-[10px] text-center text-muted-foreground font-medium px-1 leading-tight">
                Men Clothing
              </span>
            </div>
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground/80">
                <Icon icon="solar:bag-3-bold" className="size-6" />
              </div>
              <span className="text-[10px] text-center text-muted-foreground font-medium px-1 leading-tight">
                Women Bags
              </span>
            </div>
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground/80">
                <Icon icon="solar:case-minimalistic-bold" className="size-6" />
              </div>
              <span className="text-[10px] text-center text-muted-foreground font-medium px-1">
                Men Bags
              </span>
            </div>
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground/80">
                <Icon icon="mdi:dress" className="size-6" />
              </div>
              <span className="text-[10px] text-center text-muted-foreground font-medium px-1 leading-tight">
                Women Clothing
              </span>
            </div>
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground/80">
                <Icon icon="solar:user-bold" className="size-6" />
              </div>
              <span className="text-[10px] text-center text-muted-foreground font-medium">
                Girls
              </span>
            </div>
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground/80">
                <Icon icon="solar:user-bold" className="size-6" />
              </div>
              <span className="text-[10px] text-center text-muted-foreground font-medium">
                Boys
              </span>
            </div>
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground/80">
                <Icon icon="solar:globe-bold" className="size-6" />
              </div>
              <span className="text-[10px] text-center text-muted-foreground font-medium px-1">
                Global Purchase
              </span>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-background p-4 pb-24">
          <div className="w-full h-24 rounded-lg overflow-hidden mb-6 relative">
            <img
              alt="Lifestyle Category"
              src="https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&q=80"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center px-4">
              <div className="text-white">
                <h3 className="font-bold text-lg font-heading">Lifestyle Collection</h3>
                <p className="text-[10px] opacity-80">Explore new arrivals in home & gifts</p>
              </div>
            </div>
          </div>
          <div className="space-y-8">
            <div>
              <h4 className="font-bold text-sm text-foreground mb-4 font-heading flex items-center justify-between">
                Home & Decor
                <Icon
                  icon="solar:alt-arrow-right-linear"
                  className="size-4 text-muted-foreground"
                />
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-2">
                  <div className="aspect-square w-full bg-card rounded-xl border border-border/40 p-3 flex items-center justify-center">
                    <Icon icon="solar:home-smile-bold" className="size-8 text-[#00AB56]" />
                  </div>
                  <span className="text-[10px] text-center text-muted-foreground font-medium">
                    Wall Art
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="aspect-square w-full bg-card rounded-xl border border-border/40 p-3 flex items-center justify-center">
                    <Icon icon="solar:leaf-bold" className="size-8 text-[#4CAF50]" />
                  </div>
                  <span className="text-[10px] text-center text-muted-foreground font-medium">
                    Plants
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="aspect-square w-full bg-card rounded-xl border border-border/40 p-3 flex items-center justify-center">
                    <Icon icon="solar:lamp-bold" className="size-8 text-[#FFC107]" />
                  </div>
                  <span className="text-[10px] text-center text-muted-foreground font-medium">
                    Lighting
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground mb-4 font-heading flex items-center justify-between">
                Gifts & Stationery
                <Icon
                  icon="solar:alt-arrow-right-linear"
                  className="size-4 text-muted-foreground"
                />
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-2">
                  <div className="aspect-square w-full bg-card rounded-xl border border-border/40 p-3 flex items-center justify-center">
                    <Icon icon="solar:letter-bold" className="size-8 text-[#FF424F]" />
                  </div>
                  <span className="text-[10px] text-center text-muted-foreground font-medium">
                    Cards
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="aspect-square w-full bg-card rounded-xl border border-border/40 p-3 flex items-center justify-center">
                    <Icon icon="solar:box-bold" className="size-8 text-[#795548]" />
                  </div>
                  <span className="text-[10px] text-center text-muted-foreground font-medium">
                    Gifts
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="aspect-square w-full bg-card rounded-xl border border-border/40 p-3 flex items-center justify-center">
                    <Icon icon="solar:pen-bold" className="size-8 text-[#2196F3]" />
                  </div>
                  <span className="text-[10px] text-center text-muted-foreground font-medium">
                    Pens
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground mb-4 font-heading flex items-center justify-between">
                Outdoor & Living
                <Icon
                  icon="solar:alt-arrow-right-linear"
                  className="size-4 text-muted-foreground"
                />
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-2">
                  <div className="aspect-square w-full bg-card rounded-xl border border-border/40 p-3 flex items-center justify-center">
                    <Icon icon="solar:cup-bold" className="size-8 text-[#FF9800]" />
                  </div>
                  <span className="text-[10px] text-center text-muted-foreground font-medium">
                    Drinkware
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="aspect-square w-full bg-card rounded-xl border border-border/40 p-3 flex items-center justify-center">
                    <Icon icon="solar:sun-bold" className="size-8 text-[#FDD835]" />
                  </div>
                  <span className="text-[10px] text-center text-muted-foreground font-medium">
                    Beach
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="aspect-square w-full bg-card rounded-xl border border-border/40 p-3 flex items-center justify-center">
                    <Icon icon="solar:waterdrop-bold" className="size-8 text-[#03A9F4]" />
                  </div>
                  <span className="text-[10px] text-center text-muted-foreground font-medium">
                    Garden
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="fixed right-4 bottom-24 z-50">
        <button className="bg-primary text-primary-foreground size-14 rounded-xl shadow-lg flex flex-col items-center justify-center gap-0.5 border-2 border-white/20">
          <Icon icon="solar:chat-round-dots-bold" className="size-6" />
          <span className="text-[9px] font-bold">assistant</span>
        </button>
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border flex justify-around items-center py-2 pb-5 z-50">
        <div className="flex flex-col items-center gap-1">
          <div className="text-muted-foreground">
            <Icon icon="solar:home-2-linear" className="size-6" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">Front page</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="text-primary">
            <Icon icon="solar:widget-bold" className="size-6" />
          </div>
          <span className="text-[10px] font-medium text-primary">Classification</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="text-muted-foreground">
            <Icon icon="solar:cart-large-linear" className="size-6" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">Cart</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="text-muted-foreground">
            <Icon icon="solar:user-circle-linear" className="size-6" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">Mine</span>
        </div>
      </div>
    </div>
  );
}
