import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
  { id: 'cat-lifestyle', name: 'Lifestyle', slug: 'lifestyle', description: 'Lifestyle products and accessories', icon: 'solar:gift-bold', sortOrder: 1 },
  { id: 'cat-men-shoes', name: 'Men Shoes', slug: 'men-shoes', description: 'Men\'s footwear collection', icon: 'mdi:shoe-formal', sortOrder: 2 },
  { id: 'cat-women-shoes', name: 'Women Shoes', slug: 'women-shoes', description: 'Women\'s footwear collection', icon: 'mdi:shoe-heel', sortOrder: 3 },
  { id: 'cat-accessories', name: 'Accessories', slug: 'accessories', description: 'Fashion accessories', icon: 'solar:glasses-bold', sortOrder: 4 },
  { id: 'cat-men-clothing', name: 'Men Clothing', slug: 'men-clothing', description: 'Men\'s clothing', icon: 'solar:t-shirt-bold', sortOrder: 5 },
  { id: 'cat-women-bags', name: 'Women Bags', slug: 'women-bags', description: 'Women\'s bags and purses', icon: 'solar:bag-3-bold', sortOrder: 6 },
  { id: 'cat-men-bags', name: 'Men Bags', slug: 'men-bags', description: 'Men\'s bags and backpacks', icon: 'solar:case-minimalistic-bold', sortOrder: 7 },
  { id: 'cat-women-clothing', name: 'Women Clothing', slug: 'women-clothing', description: 'Women\'s clothing', icon: 'mdi:dress', sortOrder: 8 },
  { id: 'cat-girls', name: 'Girls', slug: 'girls', description: 'Girls fashion', icon: 'solar:user-bold', sortOrder: 9 },
  { id: 'cat-boys', name: 'Boys', slug: 'boys', description: 'Boys fashion', icon: 'solar:user-bold', sortOrder: 10 },
  { id: 'cat-electronics', name: 'Electronics', slug: 'electronics', description: 'Electronics and gadgets', icon: 'solar:laptop-bold', sortOrder: 11 },
  { id: 'cat-home-garden', name: 'Home & Garden', slug: 'home-garden', description: 'Home and garden items', icon: 'solar:home-2-bold', sortOrder: 12 },
]

async function main() {
  console.log('Creating categories...')

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        icon: category.icon,
        sortOrder: category.sortOrder,
      },
      create: {
        ...category,
        isActive: true,
        showOnHome: true,
      },
    })
    console.log(`✓ ${category.name}`)
  }

  console.log('Categories created successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
