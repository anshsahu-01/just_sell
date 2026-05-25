import { prisma } from "../src/config/prisma";

async function main() {
  const order = await prisma.order.findFirst({ where: { paymentStatus: 'payment_pending' } });
  if (!order) {
    console.log('No pending order found');
    process.exit(0);
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      utrNumber: 'TEST-UTR-12345',
      paymentScreenshot: 'https://res.cloudinary.com/dstjg9xdh/image/upload/v1779466868/becho/payments/sample-proof.jpg'
    }
  });

  console.log('Updated order', updated.id);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
