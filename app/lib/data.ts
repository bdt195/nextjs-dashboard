import { PrismaClient } from '@prisma/client';
import { InvoiceForm, User } from './definitions';
import { formatCurrency } from './utils';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function fetchRevenue() {
  // Add noStore() here to prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).

  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    console.log('Fetching revenue data...');

    return await prisma.revenue.findMany();
    // console.log('Data fetch completed after 3 seconds.');
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  try {
    console.log('Fetching latest invoices data...');

    const latestInvoices = await prisma.invoices.findMany({
      select: {
        id: true,
        amount: true,
        customer: {
          select: {
            name: true,
            email: true,
            image_url: true,
          },
        },
      },
      take: 5,
    });

    return latestInvoices.map((invoice) => {
      return {
        ...invoice,
        amount: formatCurrency(invoice.amount),
      };
    });
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  try {
    console.log('Fetching card data...');

    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    const invoiceCountPromise = prisma.invoices.count();
    const customerCountPromise = prisma.customers.count();
    const invoicesPromise = prisma.invoices.findMany({
      select: {
        status: true,
        amount: true,
      },
    });

    const [numberOfInvoices, numberOfCustomers, invoices] = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoicesPromise,
    ]);

    let totalPaidInvoices = 0;
    let totalPendingInvoices = 0;

    invoices.forEach((invoice) => {
      if (invoice.status === 'paid') {
        totalPaidInvoices += invoice.amount;
      } else if (invoice.status === 'pending') {
        totalPendingInvoices += invoice.amount;
      }
    });

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices: formatCurrency(totalPaidInvoices),
      totalPendingInvoices: formatCurrency(totalPendingInvoices),
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    return await prisma.invoices.findMany({
      select: {
        id: true,
        amount: true,
        date: true,
        status: true,
        customer: {
          select: {
            name: true,
            email: true,
            image_url: true,
          },
        },
      },
      where: {
        customer: {
          name: {
            contains: query,
          },
          email: {
            contains: query,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: ITEMS_PER_PAGE,
      skip: offset,
    });
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const invoices = await prisma.invoices.findMany({
      select: {
        id: true,
      },
      where: {
        customer: {
          name: {
            contains: query,
          },
          email: {
            contains: query,
          },
        },
      },
    });

    return Math.ceil(invoices.length / ITEMS_PER_PAGE);
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const invoice = await prisma.invoices.findUnique({
      select: {
        id: true,
        customer_id: true,
        amount: true,
        status: true,
      },
      where: { id },
    });

    if (invoice === null) {
      return undefined;
    }

    return {
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
      status: invoice.status as InvoiceForm['status'],
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  try {
    return await prisma.customers.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const customersWithInvoices = await prisma.customers.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image_url: true,
        invoices: {
          select: {
            id: true,
            status: true,
            amount: true,
          },
        },
      },
      where: {
        name: {
          contains: query,
        },
        email: {
          contains: query,
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return customersWithInvoices.map((customer) => {
      let totalPending = 0;
      let totalPaid = 0;

      customer.invoices.forEach((invoice) => {
        if (invoice.status === 'pending') {
          totalPending += invoice.amount;
        } else if (invoice.status === 'paid') {
          totalPaid += invoice.amount;
        }
      });

      return {
        ...customer,
        total_pending: formatCurrency(totalPending),
        total_paid: formatCurrency(totalPaid),
      };
    });
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}

export async function getUser(email: string): Promise<User | undefined> {
  try {
    const user = await prisma.users.findUnique({
      where: {
        email,
      },
    });
    return user as User;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}
