import { Icon } from "@iconify/react";

export function Home() {
  return (
    <div className="flex flex-col w-full h-full min-h-screen bg-background pb-20 font-sans">
      <div className="bg-primary px-4 pt-4 pb-12 rounded-b-[2rem] relative z-0">
        <div className="flex justify-end mb-4">
          <button className="bg-[#0D47A1] text-white text-xs font-semibold px-4 py-1.5 rounded-md">
            Log in
          </button>
        </div>
        <div className="flex justify-between items-center mb-6 text-white">
          <div className="flex flex-col">
            <div className="text-sm font-medium opacity-90">Xả kho siêu hời</div>
            <div className="flex items-center gap-1">
              <span className="text-accent font-bold text-lg font-heading">Giá sốc bất ngờ</span>
              <div className="bg-accent text-accent-foreground rounded-full size-4 flex items-center justify-center">
                <Icon icon="solar:arrow-right-linear" className="size-3" />
              </div>
            </div>
          </div>
          <div className="relative bg-accent text-accent-foreground px-3 py-1 rounded-sm shadow-sm flex items-center gap-1">
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 size-2 bg-accent rotate-45" />
            <Icon icon="solar:calendar-bold" className="size-4" />
            <span className="text-xs font-bold whitespace-nowrap">SALE CUỐI TUẦN</span>
          </div>
        </div>
        <div className="absolute left-4 right-4 -bottom-6 z-10">
          <div className="bg-card rounded-xl shadow-lg p-3 flex items-center gap-3">
            <div className="flex-1 flex items-center bg-input rounded-lg px-3 py-2 gap-2 border border-border/50">
              <Icon icon="solar:magnifer-linear" className="text-muted-foreground size-5" />
              <input
                type="text"
                className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/70 truncate"
                placeholder="2-hour express delivery & on-time delivery"
              />
            </div>
            <button className="p-1">
              <Icon icon="solar:cart-large-2-linear" className="size-6 text-foreground" />
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 px-4 mt-10">
        <div className="w-full h-[400px] rounded-xl overflow-hidden relative mb-6 shadow-sm">
          <img
            alt="Fashion Banner"
            src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center text-center p-6 text-white">
            <h3 className="text-sm tracking-[0.2em] font-bold mb-1 uppercase text-zinc-900">
              THE ICON EVENT
            </h3>
            <p className="text-[10px] tracking-widest uppercase mb-8 text-zinc-700">
              ICONIC BANANA REPUBLIC. STYLED FOR NOW.
            </p>
            <div className="relative mb-2">
              <span className="text-lg font-medium block mb-[-10px] drop-shadow-md">up to</span>
              <span className="text-[120px] leading-[0.8] font-bold text-white drop-shadow-lg">
                40
              </span>
              <span className="text-4xl font-bold absolute top-8 -right-8 drop-shadow-lg">%</span>
              <span className="text-2xl font-bold absolute top-16 -right-10 drop-shadow-lg">
                off
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-6 drop-shadow-md">fall's best styles</h2>
            <button className="bg-white text-black px-6 py-2 text-xs font-bold tracking-widest uppercase mb-12 shadow-lg">
              SHOP FOR EVERY ADVENTURE
            </button>
            <div className="mt-auto">
              <p className="text-[10px] tracking-widest uppercase mb-1 drop-shadow-md">
                ONLINE & IN STORES
              </p>
              <h1 className="text-3xl font-serif font-bold tracking-wide drop-shadow-md">
                ZALORA FASHION
              </h1>
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-2 mb-6">
          <div className="w-6 h-1 bg-primary rounded-full" />
          <div className="w-4 h-1 bg-muted-foreground/30 rounded-full" />
          <div className="w-4 h-1 bg-muted-foreground/30 rounded-full" />
          <div className="w-4 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
        <div className="grid grid-cols-4 gap-y-6 gap-x-2 mb-8">
          <div className="flex flex-col items-center gap-2">
            <div className="size-12 rounded-full bg-[#E3F2FD] flex items-center justify-center text-[#1976D2]">
              <Icon icon="solar:gift-bold" className="size-6" />
            </div>
            <span className="text-[10px] text-center text-muted-foreground font-medium">
              Lifestyle
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="size-12 rounded-full bg-[#FFF3E0] flex items-center justify-center text-[#F57C00]">
              <Icon icon="mdi:shoe-formal" className="size-6" />
            </div>
            <span className="text-[10px] text-center text-muted-foreground font-medium">
              Men Shoes
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="size-12 rounded-full bg-[#FFF8E1] flex items-center justify-center text-[#FFA000]">
              <Icon icon="mdi:shoe-heel" className="size-6" />
            </div>
            <span className="text-[10px] text-center text-muted-foreground font-medium">
              Women Shoes
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="size-12 rounded-full bg-[#F3E5F5] flex items-center justify-center text-[#7B1FA2]">
              <Icon icon="solar:glasses-bold" className="size-6" />
            </div>
            <span className="text-[10px] text-center text-muted-foreground font-medium">
              Accessories
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="size-12 rounded-full bg-[#E0F2F1] flex items-center justify-center text-[#00796B]">
              <Icon icon="solar:t-shirt-bold" className="size-6" />
            </div>
            <span className="text-[10px] text-center text-muted-foreground font-medium">
              Men Clothing
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="size-12 rounded-full bg-[#FCE4EC] flex items-center justify-center text-[#C2185B]">
              <Icon icon="solar:bag-3-bold" className="size-6" />
            </div>
            <span className="text-[10px] text-center text-muted-foreground font-medium">
              Women Bags
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="size-12 rounded-full bg-[#E8EAF6] flex items-center justify-center text-[#303F9F]">
              <Icon icon="solar:case-minimalistic-bold" className="size-6" />
            </div>
            <span className="text-[10px] text-center text-muted-foreground font-medium">
              Men Bags
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="size-12 rounded-full bg-[#FBE9E7] flex items-center justify-center text-[#D84315]">
              <Icon icon="mdi:dress" className="size-6" />
            </div>
            <span className="text-[10px] text-center text-muted-foreground font-medium">
              Women Clothing
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="size-12 rounded-full bg-[#F1F8E9] flex items-center justify-center text-[#689F38]">
              <Icon icon="solar:user-bold" className="size-6" />
            </div>
            <span className="text-[10px] text-center text-muted-foreground font-medium">Girls</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="size-12 rounded-full bg-[#EFEBE9] flex items-center justify-center text-[#5D4037]">
              <Icon icon="solar:user-bold" className="size-6" />
            </div>
            <span className="text-[10px] text-center text-muted-foreground font-medium">Boys</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="size-12 rounded-full bg-[#E0F7FA] flex items-center justify-center text-[#0097A7]">
              <Icon icon="solar:globe-bold" className="size-6" />
            </div>
            <span className="text-[10px] text-center text-muted-foreground font-medium">
              Global
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="size-12 rounded-full bg-input flex items-center justify-center text-muted-foreground">
              <Icon icon="solar:menu-dots-bold" className="size-6" />
            </div>
            <span className="text-[10px] text-center text-muted-foreground font-medium">More</span>
          </div>
        </div>
        <div className="fixed right-4 bottom-24 z-50">
          <button className="bg-primary text-primary-foreground size-14 rounded-xl shadow-lg flex flex-col items-center justify-center gap-0.5 border-2 border-white/20">
            <Icon icon="solar:chat-round-dots-bold" className="size-6" />
            <span className="text-[9px] font-bold">assistant</span>
          </button>
        </div>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-foreground font-heading">Hot selling products</h3>
            <button className="text-primary text-sm font-medium flex items-center gap-1">
              See more <Icon icon="solar:alt-arrow-right-linear" className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-xl overflow-hidden border border-border/50 shadow-sm flex flex-col">
              <div className="aspect-[4/5] bg-muted relative">
                <img
                  alt="Nike Shoe"
                  src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-destructive text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                  -25%
                </div>
              </div>
              <div className="p-3 flex flex-col flex-1">
                <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-1">
                  Nike Air Zoom Pegasus 39 Running Shoe
                </h4>
                <div className="flex items-center gap-1 mb-2">
                  <Icon icon="solar:star-bold" className="size-3 text-accent" />
                  <span className="text-xs text-muted-foreground">4.8 (1.2k)</span>
                </div>
                <div className="mt-auto flex items-baseline gap-2">
                  <span className="text-base font-bold text-primary">$120</span>
                  <span className="text-xs text-muted-foreground line-through">$160</span>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl overflow-hidden border border-border/50 shadow-sm flex flex-col">
              <div className="aspect-[4/5] bg-muted relative">
                <img
                  alt="Black T-shirt"
                  src="https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&q=80"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-destructive text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                  -15%
                </div>
              </div>
              <div className="p-3 flex flex-col flex-1">
                <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-1">
                  Essential Cotton Crew Neck T-Shirt Black
                </h4>
                <div className="flex items-center gap-1 mb-2">
                  <Icon icon="solar:star-bold" className="size-3 text-accent" />
                  <span className="text-xs text-muted-foreground">4.5 (850)</span>
                </div>
                <div className="mt-auto flex items-baseline gap-2">
                  <span className="text-base font-bold text-primary">$25</span>
                  <span className="text-xs text-muted-foreground line-through">$30</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-foreground font-heading">New Arrivals</h3>
            <button className="text-primary text-sm font-medium flex items-center gap-1">
              See more <Icon icon="solar:alt-arrow-right-linear" className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-xl overflow-hidden border border-border/50 shadow-sm flex flex-col">
              <div className="aspect-[4/5] bg-muted relative">
                <img
                  alt="Backpack"
                  src="https://images.unsplash.com/photo-1591561954557-26941169b49e?w=400&q=80"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3 flex flex-col flex-1">
                <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-1">
                  Urban Explorer Waterproof Backpack
                </h4>
                <div className="flex items-center gap-1 mb-2">
                  <Icon icon="solar:star-bold" className="size-3 text-accent" />
                  <span className="text-xs text-muted-foreground">4.9 (230)</span>
                </div>
                <div className="mt-auto flex items-baseline gap-2">
                  <span className="text-base font-bold text-primary">$89</span>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl overflow-hidden border border-border/50 shadow-sm flex flex-col">
              <div className="aspect-[4/5] bg-muted relative">
                <img
                  alt="Sunglasses"
                  src="https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&q=80"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-destructive text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                  -10%
                </div>
              </div>
              <div className="p-3 flex flex-col flex-1">
                <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-1">
                  Classic Aviator Sunglasses Gold Frame
                </h4>
                <div className="flex items-center gap-1 mb-2">
                  <Icon icon="solar:star-bold" className="size-3 text-accent" />
                  <span className="text-xs text-muted-foreground">4.7 (500)</span>
                </div>
                <div className="mt-auto flex items-baseline gap-2">
                  <span className="text-base font-bold text-primary">$145</span>
                  <span className="text-xs text-muted-foreground line-through">$160</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border flex justify-around items-center py-2 pb-5 z-50">
        <div className="flex flex-col items-center gap-1">
          <div className="text-primary">
            <Icon icon="solar:home-2-bold" className="size-6" />
          </div>
          <span className="text-[10px] font-medium text-primary">Front page</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="text-muted-foreground">
            <Icon icon="solar:widget-bold" className="size-6" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">Classification</span>
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
