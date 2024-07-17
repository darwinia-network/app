import React, {useCallback, useState} from 'react';
import {Pagination, SearchInput} from '@aragon/ods-old';
import {Button, Card, EmptyState, Icon, IconType, Dropdown} from '@aragon/ods';
import {useTranslation} from 'react-i18next';
import {useNavigate} from 'react-router-dom';
import styled from 'styled-components';

import {MembersList} from 'components/membersList';
import {Loading} from 'components/temporary';
import {PageWrapper} from 'components/wrappers';
import {useNetwork} from 'context/network';
import {useDaoDetailsQuery} from 'hooks/useDaoDetails';
import {useDaoMembers} from 'hooks/useDaoMembers';
import {useDebouncedState} from 'hooks/useDebouncedState';
import {PluginTypes} from 'hooks/usePluginClient';
import {CHAIN_METADATA} from 'utils/constants';
import useScreen from 'hooks/useScreen';
import {useGovTokensWrapping} from 'context/govTokensWrapping';
import {useExistingToken} from 'hooks/useExistingToken';
import {Erc20WrapperTokenDetails} from '@aragon/sdk-client';
import {featureFlags} from 'utils/featureFlags';
import {useGlobalModalContext} from 'context/globalModals';
import {useGaslessGovernanceEnabled} from 'hooks/useGaslessGovernanceEnabled';

const MEMBERS_PER_PAGE = 20;

export const Community: React.FC = () => {
  const {t} = useTranslation();
  const {network} = useNetwork();
  const navigate = useNavigate();
  const {isMobile} = useScreen();
  const {open} = useGlobalModalContext();
  const {handleOpenModal} = useGovTokensWrapping();

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<'votingPower' | 'delegations'>(
    'votingPower'
  );
  const [debouncedTerm, searchTerm, setSearchTerm] = useDebouncedState('');

  const {data: daoDetails, isLoading: detailsAreLoading} = useDaoDetailsQuery();

  const pluginAddress = daoDetails?.plugins[0].instanceAddress as string;
  const pluginType = daoDetails?.plugins[0].id as PluginTypes;

  const apiPage = Math.floor(((page - 1) / 1000) * MEMBERS_PER_PAGE);
  const {
    data: {members, filteredMembers, daoToken, memberCount: totalMemberCount},
    isLoading: membersLoading,
  } = useDaoMembers(pluginAddress, pluginType, {
    searchTerm: debouncedTerm,
    sort,
    page: apiPage,
  });
  const {isGovernanceEnabled} = useGaslessGovernanceEnabled();

  const {isDAOTokenWrapped, isTokenMintable} = useExistingToken({
    daoToken,
    daoDetails,
  });

  const filteredMemberCount = filteredMembers.length;

  const showFiltered =
    filteredMemberCount > 0 &&
    filteredMemberCount < members.length &&
    apiPage === 0;
  const displayedMembers = showFiltered ? filteredMembers : members;
  const displayedMembersTotal = showFiltered
    ? filteredMemberCount
    : totalMemberCount;
  const subpageStart = (page - 1) * MEMBERS_PER_PAGE - apiPage * 1000;
  const pagedMembers = displayedMembers.slice(
    subpageStart,
    subpageStart + MEMBERS_PER_PAGE
  );

  const walletBased = pluginType === 'multisig.plugin.ring-dao.eth';

  const enableSearchSort = totalMemberCount > 0 && totalMemberCount <= 1000;
  const enableDelegation =
    featureFlags.getValue('VITE_FEATURE_FLAG_DELEGATION') === 'true';

  const sortLabel = isMobile
    ? ''
    : sort === 'delegations'
    ? t('community.sortByDelegations.selected')
    : t('community.sortByVotingPower.selected');

  /*************************************************
   *                    Handlers                   *
   *************************************************/
  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value.trim());
  };

  const navigateToTokenHoldersChart = () => {
    window.open(
      CHAIN_METADATA[network].explorer +
        '/token/tokenholderchart/' +
        daoToken?.address,
      '_blank'
    );
  };

  const navigateToMintTokens = () => {
    if (isTokenMintable) {
      navigate('mint-tokens');
    }
  };

  const handlePrimaryClick = () => {
    if (walletBased) {
      navigate('manage-members');
    } else if (isDAOTokenWrapped) {
      handleOpenModal();
    } else if (isTokenMintable) {
      open('delegateVoting');
    }
  };

  const handlePageChange = useCallback((activePage: number) => {
    setPage(activePage);
    window.scrollTo({top: 0, behavior: 'smooth'});
  }, []);

  /*************************************************
   *                     Render                    *
   *************************************************/
  if (detailsAreLoading && members.length > 0) return <Loading />;

  if (!totalMemberCount && isDAOTokenWrapped) {
    return (
      <PageWrapper includeHeader={false}>
        <Card className="mt-6 flex items-center justify-center md:mt-10">
          <EmptyState
            heading={t('community.emptyState.title')}
            description={t('community.emptyState.desc', {
              tokenSymbol:
                (daoToken as Erc20WrapperTokenDetails)?.underlyingToken
                  ?.symbol || daoToken?.symbol,
            })}
            humanIllustration={{
              body: 'ELEVATING',
              expression: 'SMILE_WINK',
              hairs: 'MIDDLE',
              sunglasses: 'BIG_ROUNDED',
              accessory: 'BUDDHA',
            }}
            primaryButton={{
              label: t('community.emptyState.ctaLabel'),
              onClick: handleOpenModal,
            }}
            secondaryButton={{
              label: t('navLinks.guide'),
              href: t('community.emptyState.descLinkURL'),
              target: '_blank',
              iconRight: IconType.LINK_EXTERNAL,
            }}
          />
        </Card>
      </PageWrapper>
    );
  }

  const pageTitle = `${totalMemberCount > 0 ? totalMemberCount : ''} ${t(
    'labels.members'
  )}`;

  // Await to load daoToken address to prevent null see all holders button
  const seeAllHoldersBtn = daoToken?.address
    ? {
        label: t('labels.seeAllHolders'),
        iconLeft: <Icon icon={IconType.LINK_EXTERNAL} />,
        onClick: navigateToTokenHoldersChart,
      }
    : undefined;

  return (
    <PageWrapper
      title={pageTitle}
      {...(walletBased
        ? {
            description: t('explore.explorer.walletBased'),
            primaryBtnProps: {
              label: t('labels.manageMember'),
              onClick: handlePrimaryClick,
            },
          }
        : !isGovernanceEnabled
        ? {
            description: t('explore.explorer.tokenBased'),
            secondaryBtnProps: seeAllHoldersBtn,
          }
        : isDAOTokenWrapped
        ? {
            description: t('explore.explorer.tokenBased'),
            primaryBtnProps: {
              label: t('governance.actionSecondary'),
              iconLeft: <Icon icon={IconType.APP_PROPOSALS} />,
              onClick: () => open('delegateVoting'),
            },
            secondaryBtnProps: {
              label: t('community.ctaMain.wrappedLabel'),
              onClick: handlePrimaryClick,
            },
            tertiaryBtnProps: seeAllHoldersBtn,
          }
        : isTokenMintable
        ? {
            description: t('explore.explorer.tokenBased'),
            primaryBtnProps: {
              label: t('governance.actionSecondary'),
              iconLeft: <Icon icon={IconType.APP_PROPOSALS} />,
              onClick: handlePrimaryClick,
            },
            secondaryBtnProps: {
              label: t('labels.mintTokens'),
              iconLeft: <Icon icon={IconType.PLUS} />,
              onClick: navigateToMintTokens,
            },
            tertiaryBtnProps: seeAllHoldersBtn,
          }
        : {
            description: t('explore.explorer.tokenBased'),
            primaryBtnProps: {
              label: t('governance.actionSecondary'),
              iconLeft: <Icon icon={IconType.APP_PROPOSALS} />,
              onClick: () => open('delegateVoting'),
            },
            secondaryBtnProps: seeAllHoldersBtn,
          })}
    >
      <BodyContainer>
        <SearchAndResultWrapper>
          <div className="flex flex-row gap-4 xl:gap-8">
            {enableSearchSort && (
              <SearchInput
                placeholder={t('labels.searchPlaceholder')}
                containerClassName="grow"
                value={searchTerm}
                onChange={handleQueryChange}
              />
            )}
            {!walletBased && enableSearchSort && enableDelegation && (
              <Dropdown.Container
                customTrigger={
                  <Button
                    variant="tertiary"
                    iconLeft={IconType.SORT_ASC}
                    size="lg"
                  >
                    {sortLabel}
                  </Button>
                }
                align="end"
              >
                <Dropdown.Item
                  icon={sort === 'votingPower' ? IconType.CHECKMARK : undefined}
                  iconPosition="right"
                  selected={sort === 'votingPower'}
                  onClick={() => setSort('votingPower')}
                >
                  {t('community.sortByVotingPower.default')}
                </Dropdown.Item>
                <Dropdown.Item
                  icon={sort === 'delegations' ? IconType.CHECKMARK : undefined}
                  iconPosition="right"
                  selected={sort === 'delegations'}
                  onClick={() => setSort('delegations')}
                >
                  {t('community.sortByDelegations.default')}
                </Dropdown.Item>
              </Dropdown.Container>
            )}
          </div>

          {/* Members List */}
          {membersLoading ? (
            <Loading />
          ) : (
            <>
              {debouncedTerm !== '' && !filteredMemberCount ? (
                <EmptyState
                  objectIllustration={{object: 'MAGNIFYING_GLASS'}}
                  heading={t('labels.noResults')}
                  description={t('labels.noResultsSubtitle')}
                />
              ) : (
                <>
                  {debouncedTerm !== '' && !membersLoading && (
                    <ResultsCountLabel>
                      {filteredMemberCount === 1
                        ? t('labels.result')
                        : t('labels.nResults', {count: filteredMemberCount})}
                    </ResultsCountLabel>
                  )}
                  <MembersList token={daoToken} members={pagedMembers} />
                </>
              )}
            </>
          )}
        </SearchAndResultWrapper>

        {/* Pagination */}
        <PaginationWrapper>
          {displayedMembersTotal > MEMBERS_PER_PAGE && (
            <Pagination
              totalPages={
                Math.ceil(displayedMembersTotal / MEMBERS_PER_PAGE) as number
              }
              activePage={page}
              onChange={handlePageChange}
            />
          )}
        </PaginationWrapper>
      </BodyContainer>
    </PageWrapper>
  );
};

const BodyContainer = styled.div.attrs({
  className: 'mt-2 xl:space-y-16',
})``;

const SearchAndResultWrapper = styled.div.attrs({className: 'space-y-10'})``;

const ResultsCountLabel = styled.p.attrs({
  className: 'font-semibold text-neutral-800 ft-text-lg',
})``;

const PaginationWrapper = styled.div.attrs({
  className: 'flex mt-16 w-full justify-center',
})``;
