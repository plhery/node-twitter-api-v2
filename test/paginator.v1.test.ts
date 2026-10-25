import 'mocha';
import { expect } from 'chai';
import { UserSearchV1Paginator } from '../src';

/** A fake `instance.get` (no network, no credentials): records the page of every call and replies with one user per page, up to `lastPage`. */
function makeFakeInstance(lastPage: number) {
  const pages: number[] = [];
  const instance = {
    get: async (_endpoint: string, query: Record<string, any>) => {
      pages.push(query.page);
      if (pages.length > 10) {
        // Without a rate limit to stop it, a paginator stuck on one page would loop forever
        throw new Error(`Too many requests, pages asked: ${pages.join(', ')}`);
      }
      return { data: query.page <= lastPage ? [user(query.page)] : [], headers: {}, rateLimit: undefined };
    },
  };

  return { instance: instance as any, pages };
}

const user = (page: number) => ({ id_str: `user-${page}` }) as any;

function makePaginator(instance: any) {
  return new UserSearchV1Paginator({
    realData: [user(1)],
    rateLimit: undefined as any,
    instance,
    queryParams: { q: 'jack', page: 1 },
  });
}

describe('v1 paginators: UserSearchV1Paginator page numbers (offline, no network or credentials needed)', () => {
  it('Should ask for the following page on each fetchNext()', async () => {
    const { instance, pages } = makeFakeInstance(3);
    const paginator = makePaginator(instance);

    await paginator.fetchNext();
    await paginator.fetchNext();

    expect(pages).to.deep.equal([2, 3]);
    expect(paginator.users.map(u => u.id_str)).to.deep.equal(['user-1', 'user-2', 'user-3']);
  });

  it('Should stop fetchLast() at the first empty page', async () => {
    const { instance, pages } = makeFakeInstance(3);
    const paginator = makePaginator(instance);

    await paginator.fetchLast();

    expect(pages).to.deep.equal([2, 3, 4]);
    expect(paginator.users.map(u => u.id_str)).to.deep.equal(['user-1', 'user-2', 'user-3']);
  });

  it('Should not change the page of the current instance on next()', async () => {
    const { instance, pages } = makeFakeInstance(3);
    const paginator = makePaginator(instance);

    const second = await paginator.next();
    await paginator.next();
    await second.fetchNext();

    expect(pages).to.deep.equal([2, 2, 3]);
    expect(second.users.map(u => u.id_str)).to.deep.equal(['user-2', 'user-3']);
  });

  it('Should continue after the pages read by a for await loop', async () => {
    const { instance, pages } = makeFakeInstance(5);
    const paginator = makePaginator(instance);

    for await (const found of paginator) {
      if (found.id_str === 'user-3') {
        break;
      }
    }
    await paginator.fetchNext();

    expect(pages).to.deep.equal([2, 3, 4]);
    expect(paginator.users.map(u => u.id_str)).to.deep.equal(['user-1', 'user-2', 'user-3', 'user-4']);
  });
});
