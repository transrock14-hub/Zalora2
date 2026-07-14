import { Icon } from "@iconify/react";

export function AccountManagement() {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 font-sans text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-center h-14 bg-primary px-4 shadow-sm">
        <h1 className="text-lg font-semibold text-primary-foreground font-heading">
          Account Management
        </h1>
        <button className="absolute right-4 text-primary-foreground">
          <Icon icon="solar:globe-linear" className="size-6" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between p-4 bg-card mb-2">
          <div className="flex items-center gap-3">
            <img
              alt="Profile"
              src="https://lh3.googleusercontent.com/a/ACg8ocJQ7WVRfQ97Y2agw09TL2Edu-mn2l4640dw502eSefNaL0ClA=s96-c"
              className="size-14 rounded-full object-cover border border-border"
            />
            <div>
              <div className="font-bold text-base">Vault One</div>
              <div className="text-xs text-muted-foreground mt-0.5">vaul****.com</div>
              <div className="text-xs text-muted-foreground mt-0.5">ID: 87119</div>
            </div>
          </div>
          <Icon icon="solar:alt-arrow-right-linear" className="size-5 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-4 bg-card py-4 mb-2">
          <div className="flex flex-col items-center gap-1 border-r border-transparent">
            <span className="text-base font-semibold">0</span>
            <span className="text-[10px] text-muted-foreground text-center px-1">
              My Collection
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 border-r border-transparent">
            <span className="text-base font-semibold">0</span>
            <span className="text-[10px] text-muted-foreground text-center px-1">
              Shop Collection
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 border-r border-transparent">
            <span className="text-base font-semibold">20</span>
            <span className="text-[10px] text-muted-foreground text-center px-1">My Browse</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-base font-bold text-foreground">$55404.97</span>
            <span className="text-[10px] text-muted-foreground text-center px-1">
              Account Balance
            </span>
          </div>
        </div>
        <div className="bg-card mb-px">
          <div className="px-4 py-3 text-sm font-semibold border-b border-border">My Orders</div>
          <div className="grid grid-cols-5 py-4">
            <div className="flex flex-col items-center gap-2">
              <Icon icon="solar:card-linear" className="size-7 text-foreground" />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                Payment
                <br />
                pending
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Icon icon="solar:box-linear" className="size-7 text-foreground" />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                Waiting for
                <br />
                delivery
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Icon icon="solar:delivery-linear" className="size-7 text-foreground" />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                Waiting for
                <br />
                receipt
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Icon icon="solar:chat-square-check-linear" className="size-7 text-foreground" />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                Completed
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Icon icon="solar:restart-linear" className="size-7 text-foreground" />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                Refund/
                <br />
                After-sales
              </span>
            </div>
          </div>
        </div>
        <div className="flex bg-card py-3 mb-2 divide-x divide-border">
          <button className="flex-1 flex items-center justify-center gap-2 py-1">
            <Icon icon="solar:download-linear" className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">top up</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-1">
            <Icon icon="solar:upload-linear" className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">Withdrawal</span>
          </button>
        </div>
        <div className="bg-card flex flex-col">
          <div className="flex items-center px-4 py-3.5 border-b border-border/50 active:bg-muted/30">
            <Icon icon="solar:megaphone-bold" className="size-6 text-chart-1 mr-3" />
            <span className="flex-1 text-sm font-medium">Wholesale Management</span>
            <Icon icon="solar:alt-arrow-right-linear" className="size-4 text-muted-foreground" />
          </div>
          <div className="flex items-center px-4 py-3.5 border-b border-border/50 active:bg-muted/30">
            <Icon icon="solar:shop-bold" className="size-6 text-chart-2 mr-3" />
            <span className="flex-1 text-sm font-medium">Shop Details</span>
            <Icon icon="solar:alt-arrow-right-linear" className="size-4 text-muted-foreground" />
          </div>
          <div className="flex items-center px-4 py-3.5 border-b border-border/50 active:bg-muted/30">
            <Icon icon="solar:box-bold" className="size-6 text-chart-2 mr-3" />
            <span className="flex-1 text-sm font-medium">Product Management</span>
            <Icon icon="solar:alt-arrow-right-linear" className="size-4 text-muted-foreground" />
          </div>
          <div className="flex items-center px-4 py-3.5 border-b border-border/50 active:bg-muted/30">
            <Icon icon="solar:bill-list-bold" className="size-6 text-cyan-500 mr-3" />
            <span className="flex-1 text-sm font-medium">Store Orders</span>
            <Icon icon="solar:alt-arrow-right-linear" className="size-4 text-muted-foreground" />
          </div>
          <div className="flex items-center px-4 py-3.5 border-b border-border/50 active:bg-muted/30">
            <Icon icon="solar:document-text-bold" className="size-6 text-chart-3 mr-3" />
            <span className="flex-1 text-sm font-medium">Billing records</span>
            <Icon icon="solar:alt-arrow-right-linear" className="size-4 text-muted-foreground" />
          </div>
          <div className="flex items-center px-4 py-3.5 border-b border-border/50 active:bg-muted/30">
            <Icon icon="solar:map-point-bold" className="size-6 text-destructive mr-3" />
            <span className="flex-1 text-sm font-medium">Delivery address</span>
            <Icon icon="solar:alt-arrow-right-linear" className="size-4 text-muted-foreground" />
          </div>
          <div className="flex items-center px-4 py-3.5 border-b border-border/50 active:bg-muted/30">
            <Icon icon="solar:heart-bold" className="size-6 text-chart-2 mr-3" />
            <span className="flex-1 text-sm font-medium">Shop Collection</span>
            <Icon icon="solar:alt-arrow-right-linear" className="size-4 text-muted-foreground" />
          </div>
          <div className="flex items-center px-4 py-3.5 border-b border-border/50 active:bg-muted/30">
            <Icon icon="solar:headset-bold" className="size-6 text-destructive mr-3" />
            <span className="flex-1 text-sm font-medium">Service Center</span>
            <Icon icon="solar:alt-arrow-right-linear" className="size-4 text-muted-foreground" />
          </div>
          <div className="flex items-center px-4 py-3.5 border-b border-border/50 active:bg-muted/30">
            <Icon icon="solar:wallet-bold" className="size-6 text-chart-4 mr-3" />
            <span className="flex-1 text-sm font-medium">Wallet Management</span>
            <Icon icon="solar:alt-arrow-right-linear" className="size-4 text-muted-foreground" />
          </div>
          <div className="flex items-center px-4 py-3.5 border-b border-border/50 active:bg-muted/30">
            <Icon icon="solar:lock-password-bold" className="size-6 text-cyan-500 mr-3" />
            <span className="flex-1 text-sm font-medium">Login Password</span>
            <Icon icon="solar:alt-arrow-right-linear" className="size-4 text-muted-foreground" />
          </div>
          <div className="flex items-center px-4 py-3.5 border-b border-border/50 active:bg-muted/30">
            <Icon icon="solar:shield-keyhole-bold" className="size-6 text-chart-3 mr-3" />
            <span className="flex-1 text-sm font-medium">Payment password</span>
            <Icon icon="solar:alt-arrow-right-linear" className="size-4 text-muted-foreground" />
          </div>
          <div className="flex items-center px-4 py-3.5 border-b border-border/50 active:bg-muted/30">
            <Icon icon="solar:file-download-bold" className="size-6 text-chart-4 mr-3" />
            <span className="flex-1 text-sm font-medium">Download the app</span>
            <Icon icon="solar:alt-arrow-right-linear" className="size-4 text-muted-foreground" />
          </div>
          <div className="flex items-center px-4 py-3.5 border-b border-border/50 active:bg-muted/30">
            <Icon icon="solar:settings-bold" className="size-6 text-cyan-500 mr-3" />
            <span className="flex-1 text-sm font-medium">set up</span>
            <Icon icon="solar:alt-arrow-right-linear" className="size-4 text-muted-foreground" />
          </div>
          <div className="flex items-center px-4 py-3.5 active:bg-muted/30">
            <Icon icon="solar:logout-bold" className="size-6 text-chart-5 mr-3" />
            <span className="flex-1 text-sm font-medium">Log out</span>
            <Icon icon="solar:alt-arrow-right-linear" className="size-4 text-muted-foreground" />
          </div>
        </div>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-between items-center px-2 py-1 pb-safe-area shadow-lg z-50">
        <button className="flex flex-col items-center justify-center p-2 w-full text-muted-foreground">
          <Icon icon="solar:home-2-linear" className="size-6 mb-1" />
          <span className="text-[10px]">front page</span>
        </button>
        <button className="flex flex-col items-center justify-center p-2 w-full text-muted-foreground">
          <Icon icon="solar:widget-2-linear" className="size-6 mb-1" />
          <span className="text-[10px]">Classification</span>
        </button>
        <button className="flex flex-col items-center justify-center p-2 w-full text-muted-foreground" />
      </nav>
    </div>
  );
}
