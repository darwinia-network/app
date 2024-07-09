import React from 'react';
import {ListItemHeader} from '@aragon/ods-old';
import {Button, IconType} from '@aragon/ods';
import {useTranslation} from 'react-i18next';
import {generatePath, useNavigate} from 'react-router-dom';
import styled from 'styled-components';

import {MembersList} from 'components/membersList';
import {Loading} from 'components/temporary';
import {useNetwork} from 'context/network';
import {useDaoMembers} from 'hooks/useDaoMembers';
import {PluginTypes} from 'hooks/usePluginClient';
import useScreen from 'hooks/useScreen';
import {
  Community,
  ManageMembersProposal,
  MintTokensProposal,
} from 'utils/paths';
import {useDaoDetailsQuery} from 'hooks/useDaoDetails';
import {useExistingToken} from 'hooks/useExistingToken';
import {useGovTokensWrapping} from 'context/govTokensWrapping';

type Props = {
  daoAddressOrEns: string;
  pluginType: PluginTypes;
  pluginAddress: string;
  horizontal?: boolean;
};

export const MembershipSnapshot: React.FC<Props> = ({
  daoAddressOrEns,
  pluginType,
  pluginAddress,
  horizontal,
}) => {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const {network} = useNetwork(); // TODO ensure this is the dao network
  const {isDesktop} = useScreen();
  const {handleOpenModal} = useGovTokensWrapping();

  const {
    data: {members, daoToken, memberCount: totalMemberCount},
    isLoading,
  } = useDaoMembers(pluginAddress, pluginType, {page: 0});

  const {data: daoDetails} = useDaoDetailsQuery();

  const {isDAOTokenWrapped, isTokenMintable} = useExistingToken({
    daoToken,
    daoDetails,
  });

  const walletBased = pluginType === 'multisig.plugin.echo77.eth';

  const headerButtonHandler = () => {
    walletBased
      ? navigate(
          generatePath(ManageMembersProposal, {network, dao: daoAddressOrEns})
        )
      : isDAOTokenWrapped
      ? handleOpenModal()
      : isTokenMintable
      ? navigate(
          generatePath(MintTokensProposal, {network, dao: daoAddressOrEns})
        )
      : navigate(generatePath(Community, {network, dao: daoAddressOrEns}));
  };

  if (isLoading) return <Loading />;

  if (members.length === 0) return null;

  const displayedMembers = members.slice(0, 3);

  if (horizontal && isDesktop) {
    return (
      <div className="flex space-x-6">
        <div className="w-1/3">
          <ListItemHeader
            icon={IconType.APP_MEMBERS}
            value={`${totalMemberCount > 0 ? totalMemberCount : ''} ${t(
              'labels.members'
            )}`}
            label={
              walletBased
                ? t('explore.explorer.walletBased')
                : t('explore.explorer.tokenBased')
            }
            buttonText={
              walletBased
                ? t('labels.manageMember')
                : isDAOTokenWrapped
                ? t('community.ctaMain.wrappedLabel')
                : isTokenMintable
                ? t('labels.addMember')
                : t('labels.seeCommunity')
            }
            orientation="vertical"
            onClick={headerButtonHandler}
          />
        </div>
        <div className="w-2/3 space-y-4">
          <ListItemGrid>
            <MembersList token={daoToken} members={displayedMembers} />
          </ListItemGrid>
          <Button
            variant="tertiary"
            size="lg"
            iconRight={IconType.CHEVRON_RIGHT}
            onClick={() =>
              navigate(generatePath(Community, {network, dao: daoAddressOrEns}))
            }
          >
            {t('labels.seeAll')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <VerticalContainer>
      <ListItemHeader
        icon={IconType.APP_MEMBERS}
        value={`${totalMemberCount > 0 ? totalMemberCount : ''} ${t(
          'labels.members'
        )}`}
        label={
          walletBased
            ? t('explore.explorer.walletBased')
            : t('explore.explorer.tokenBased')
        }
        buttonText={
          walletBased
            ? t('labels.manageMember')
            : isDAOTokenWrapped
            ? t('community.ctaMain.wrappedLabel')
            : isTokenMintable
            ? t('labels.addMember')
            : t('labels.seeCommunity')
        }
        orientation="vertical"
        onClick={headerButtonHandler}
      />
      <MembersList
        token={daoToken}
        members={displayedMembers}
        isCompactMode={true}
      />
      <Button
        variant="tertiary"
        size="lg"
        iconRight={IconType.CHEVRON_RIGHT}
        onClick={() =>
          navigate(generatePath(Community, {network, dao: daoAddressOrEns}))
        }
      >
        {t('labels.seeAll')}
      </Button>
    </VerticalContainer>
  );
};

const VerticalContainer = styled.div.attrs({
  className: 'space-y-3 xl:space-y-4',
})``;

const ListItemGrid = styled.div.attrs({
  className: 'xl:grid xl:grid-cols-1 xl:grid-flow-row xl:gap-4',
})``;
