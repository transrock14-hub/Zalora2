import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const products = [
  // Men Shoes
  {
    name: 'Nike Air Max 270',
    slug: 'nike-air-max-270',
    description: 'Experience ultimate comfort with the Nike Air Max 270. Featuring a large Air unit for cushioning and a sleek design.',
    price: 150,
    comparePrice: 180,
    stock: 50,
    sku: 'NIKE-AM270-BLK',
    categorySlug: 'men-shoes',
    isFeatured: true,
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'],
  },
  {
    name: 'Adidas Ultraboost 22',
    slug: 'adidas-ultraboost-22',
    description: 'Run with energy return. The Ultraboost 22 delivers incredible energy with every stride.',
    price: 180,
    comparePrice: 220,
    stock: 30,
    sku: 'ADIDAS-UB22-WHT',
    categorySlug: 'men-shoes',
    images: ['https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80'],
  },
  // Women Shoes
  {
    name: 'Nike Air Force 1 White',
    slug: 'nike-air-force-1-white',
    description: 'Classic style that never goes out of fashion. The iconic Nike Air Force 1 in pristine white.',
    price: 120,
    comparePrice: null,
    stock: 75,
    sku: 'NIKE-AF1-WHT',
    categorySlug: 'women-shoes',
    isFeatured: true,
    images: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80'],
  },
  {
    name: 'Puma Suede Classic',
    slug: 'puma-suede-classic',
    description: 'Timeless design meets modern comfort. Puma Suede Classic in multiple colors.',
    price: 85,
    comparePrice: 100,
    stock: 60,
    sku: 'PUMA-SD-CLS',
    categorySlug: 'women-shoes',
    images: ['https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=800&q=80'],
  },
  // Men Clothing
  {
    name: 'Premium Cotton T-Shirt',
    slug: 'premium-cotton-tshirt',
    description: 'Soft, comfortable, and durable. Made from 100% premium cotton for everyday wear.',
    price: 29,
    comparePrice: 45,
    stock: 200,
    sku: 'TSHIRT-COT-BLK',
    categorySlug: 'men-clothing',
    isFeatured: true,
    images: ['https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80'],
  },
  {
    name: 'Denim Jacket - Dark Blue',
    slug: 'denim-jacket-dark-blue',
    description: 'Classic denim jacket with a modern fit. Perfect for layering in any season.',
    price: 89,
    comparePrice: 120,
    stock: 40,
    sku: 'DNM-JKT-BLU',
    categorySlug: 'men-clothing',
    images: ['https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=800&q=80'],
  },
  {
    name: 'Slim Fit Chinos',
    slug: 'slim-fit-chinos',
    description: 'Versatile chinos that work for any occasion. Slim fit with stretch for comfort.',
    price: 65,
    comparePrice: null,
    stock: 80,
    sku: 'CHINO-SLM-BEG',
    categorySlug: 'men-clothing',
    images: ['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80'],
  },
  // Women Clothing
  {
    name: 'Floral Summer Dress',
    slug: 'floral-summer-dress',
    description: 'Light, breezy summer dress with beautiful floral patterns. Perfect for warm days.',
    price: 79,
    comparePrice: 95,
    stock: 45,
    sku: 'DRS-FLR-SUM',
    categorySlug: 'women-clothing',
    isFeatured: true,
    images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80'],
  },
  {
    name: 'Cashmere Blend Sweater',
    slug: 'cashmere-blend-sweater',
    description: 'Luxurious cashmere blend sweater. Soft, warm, and incredibly comfortable.',
    price: 129,
    comparePrice: 160,
    stock: 35,
    sku: 'SWT-CASH-GRY',
    categorySlug: 'women-clothing',
    images: ['https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&q=80'],
  },
  // Accessories
  {
    name: 'Ray-Ban Aviator Sunglasses',
    slug: 'rayban-aviator-sunglasses',
    description: 'Classic aviator sunglasses with UV protection. Timeless style for any face shape.',
    price: 154,
    comparePrice: 180,
    stock: 55,
    sku: 'RAY-AVI-GLD',
    categorySlug: 'accessories',
    isFeatured: true,
    images: ['https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80'],
  },
  {
    name: 'Leather Watch - Brown',
    slug: 'leather-watch-brown',
    description: 'Elegant leather strap watch with minimalist design. Perfect for business or casual.',
    price: 199,
    comparePrice: null,
    stock: 25,
    sku: 'WATCH-LTH-BRN',
    categorySlug: 'accessories',
    images: ['https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80'],
  },
  // Women Bags
  {
    name: 'Designer Tote Bag',
    slug: 'designer-tote-bag',
    description: 'Spacious designer tote bag made from premium vegan leather. Perfect for work or travel.',
    price: 159,
    comparePrice: 220,
    stock: 30,
    sku: 'BAG-TOT-BLK',
    categorySlug: 'women-bags',
    isFeatured: true,
    images: ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80'],
  },
  {
    name: 'Crossbody Leather Bag',
    slug: 'crossbody-leather-bag',
    description: 'Compact crossbody bag with adjustable strap. Perfect for everyday use.',
    price: 89,
    comparePrice: 110,
    stock: 50,
    sku: 'BAG-CRS-TAN',
    categorySlug: 'women-bags',
    images: ['https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80'],
  },
  // Men Bags
  {
    name: 'Laptop Backpack',
    slug: 'laptop-backpack',
    description: 'Durable backpack with padded laptop compartment. Water-resistant and comfortable.',
    price: 129,
    comparePrice: null,
    stock: 40,
    sku: 'BP-LAP-BLK',
    categorySlug: 'men-bags',
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80'],
  },
  {
    name: 'Leather Messenger Bag',
    slug: 'leather-messenger-bag',
    description: 'Professional leather messenger bag with multiple compartments. Perfect for work.',
    price: 189,
    comparePrice: 230,
    stock: 20,
    sku: 'MSG-LTH-BRN',
    categorySlug: 'men-bags',
    isFeatured: true,
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80'],
  },
]

async function main() {
  console.log('Creating demo products...')

  for (const product of products) {
    // Find the category
    const category = await prisma.category.findUnique({
      where: { slug: product.categorySlug },
    })

    if (!category) {
      console.log(`❌ Category ${product.categorySlug} not found, skipping ${product.name}`)
      continue
    }

    // Create or update product
    const createdProduct = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        description: product.description,
        price: product.price,
        comparePrice: product.comparePrice,
        stock: product.stock,
        sku: product.sku,
        categoryId: category.id,
        isFeatured: product.isFeatured || false,
        status: 'PUBLISHED',
        rating: 4.5 + Math.random() * 0.5, // Random rating between 4.5-5.0
        totalReviews: Math.floor(Math.random() * 500) + 100, // Random reviews between 100-600
      },
      create: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        comparePrice: product.comparePrice,
        stock: product.stock,
        sku: product.sku,
        categoryId: category.id,
        isFeatured: product.isFeatured || false,
        status: 'PUBLISHED',
        rating: 4.5 + Math.random() * 0.5,
        totalReviews: Math.floor(Math.random() * 500) + 100,
      },
    })

    // Create product image
    const existingImage = await prisma.productImage.findFirst({
      where: {
        productId: createdProduct.id,
        url: product.images[0],
      },
    })

    if (!existingImage) {
      await prisma.productImage.create({
        data: {
          productId: createdProduct.id,
          url: product.images[0],
          alt: product.name,
          isPrimary: true,
          sortOrder: 0,
        },
      })
    }

    console.log(`✓ ${product.name} (${category.name})`)
  }

  console.log('\n✅ Demo products created successfully!')
  console.log(`Total products: ${products.length}`)
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
