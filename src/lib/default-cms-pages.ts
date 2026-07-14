/**
 * Default storefront CMS pages used when a matching `pages` row is missing
 * or inactive — so links like /about never 404.
 *
 * Content is adapted from ZALORA's public company positioning (fashion &
 * lifestyle destination for Southeast Asia), written for this marketplace.
 */

export const DEFAULT_ABOUT_PAGE = {
  title: 'About Us',
  content: `
    <p><strong>ZALORA</strong> is a leading online fashion, beauty, and lifestyle destination — inspired by Asia’s pioneering style commerce platforms and built for shoppers who want curated looks in one place.</p>

    <h2>Our story</h2>
    <p>We started with a simple idea: make fashion discovery effortless. From apparel and shoes to accessories, beauty, and home &amp; lifestyle, ZALORA brings international and local labels together so you can shop trends, essentials, and statement pieces without switching between stores.</p>

    <h2>What we offer</h2>
    <ul>
      <li><strong>Curated assortment</strong> — thousands of styles across men’s, women’s, kids, and lifestyle categories</li>
      <li><strong>Authentic brands</strong> — trusted sellers and clear product information so you buy with confidence</li>
      <li><strong>Seamless shopping</strong> — browse on mobile or desktop, compare deals, and check out in a few steps</li>
      <li><strong>Seller community</strong> — merchants can open a store, list products, and reach fashion-forward customers</li>
    </ul>

    <h2>Our mission</h2>
    <p>To connect people to a limitless world of fashion and lifestyle — helping every customer express their style, and every brand partner grow through online commerce.</p>

    <h2>Why shop with us</h2>
    <p>Whether you are chasing the latest drop, refreshing your wardrobe basics, or hunting weekend deals, ZALORA is designed around discovery: clear categories, featured collections, and promotions that make it easy to find what you love.</p>

    <h2>Join us</h2>
    <p>Create an account to save favourites, track orders, and unlock a smoother shopping experience. Brand owners and resellers can apply to open a store and sell on ZALORA.</p>

    <p>Have a question? Reach our team via the <a href="/contact">Contact Us</a> page — we are here to help.</p>
  `.trim(),
  metaTitle: 'About Us - ZALORA',
  metaDesc:
    'Learn about ZALORA — online fashion, beauty, and lifestyle shopping with curated brands and seamless discovery.',
}
