import React, {ReactNode, useEffect, useRef, useState} from 'react';
import {AvatarDao, Link} from '@aragon/ods-old';
import {AlertInline, Button, Icon, IconType, Tag, Dropdown} from '@aragon/ods';
import {DaoDetails} from '@aragon/sdk-client';
import {useTranslation} from 'react-i18next';
import {generatePath, useNavigate, useParams} from 'react-router-dom';
import styled from 'styled-components';

import {Loading} from 'components/temporary';
import {PageWrapper} from 'components/wrappers';
import MajorityVotingSettings from 'containers/settings/majorityVoting';
import MultisigSettings from 'containers/settings/multisig';
import {
  Definition,
  DescriptionPair,
  SettingsCard,
  Term,
} from 'containers/settings/settingsCard';
import {SettingsUpdateCard} from 'containers/settings/updateCard';
import {VersionInfoCard} from 'containers/settings/versionInfoCard';
import {useNetwork} from 'context/network';
import {useDaoDetailsQuery} from 'hooks/useDaoDetails';
import {GaslessPluginName, PluginTypes} from 'hooks/usePluginClient';
import useScreen from 'hooks/useScreen';
import {CHAIN_METADATA} from 'utils/constants';
import {featureFlags} from 'utils/featureFlags';
import {shortenAddress, toDisplayEns} from 'utils/library';
import {EditSettings} from 'utils/paths';
import GaslessVotingSettings from '../containers/settings/gaslessVoting';
import {useIsMember} from 'services/aragon-sdk/queries/use-is-member';
import {useWallet} from 'hooks/useWallet';
import {useUpdateExists} from 'hooks/useUpdateExists';

export const Settings: React.FC = () => {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const {address} = useWallet();
  const {isDesktop} = useScreen();

  // move into components when proper loading experience is implemented
  const {data: daoDetails, isLoading} = useDaoDetailsQuery();
  const updateExists = useUpdateExists();

  const pluginAddress = daoDetails?.plugins?.[0]?.instanceAddress as string;
  const pluginType = daoDetails?.plugins?.[0]?.id as PluginTypes;

  const {data: isMember} = useIsMember({
    address: address as string,
    pluginAddress,
    pluginType,
  });

  if (isLoading) {
    return <Loading />;
  }

  if (!daoDetails) {
    return null;
  }

  const daoUpdateEnabled =
    featureFlags.getValue('VITE_FEATURE_FLAG_OSX_UPDATES') === 'true';

  const showUpdatesCard = updateExists && isMember && daoUpdateEnabled;

  return (
    <SettingsWrapper>
      {showUpdatesCard && (
        <div className={`mt-1 xl:mt-3 ${styles.fullWidth}`}>
          <SettingsUpdateCard />
        </div>
      )}

      {/* DAO Settings */}
      <div
        className={`mt-2 xl:row-start-3 xl:-mt-2 ${
          daoUpdateEnabled ? styles.leftCol : styles.center
        }`}
      >
        <div className="flex flex-col gap-y-6">
          {/* DAO SECTION */}
          <SettingsCardDao daoDetails={daoDetails} />

          {/* COMMUNITY SECTION */}
          <PluginSettingsWrapper daoDetails={daoDetails} />
        </div>
      </div>

      {/* Version Info */}
      {daoUpdateEnabled && (
        <VersionInfoCard
          pluginAddress={daoDetails.plugins[0].instanceAddress}
          pluginType={daoDetails.plugins[0].id as PluginTypes}
          pluginVersion={`${daoDetails.plugins[0].release}.${daoDetails.plugins[0].build}`}
          daoAddress={daoDetails.address}
        />
      )}

      {/* Edit */}
      <div
        className={`xl:row-start-4 ${
          daoUpdateEnabled ? styles.fullWidth : styles.center
        }`}
      >
        <div className="mt-2 space-y-4 xl:-mt-2">
          <Button
            className="w-full md:w-max"
            size="lg"
            variant="primary"
            iconLeft={!isDesktop ? IconType.APP_PROPOSALS : undefined}
            onClick={() => navigate('edit')}
          >
            {t('settings.edit')}
          </Button>
          <AlertInline
            message={t('settings.proposeSettingsInfo')}
            variant="info"
          />
        </div>
      </div>
    </SettingsWrapper>
  );
};
const styles = {
  fullWidth: 'col-span-full xl:col-start-2 xl:col-end-12 xl:col-span-6',
  leftCol: 'col-span-full xl:col-start-2 xl:col-end-8',
  center: 'col-span-full xl:col-start-4 xl:col-end-10 xl:col-span-6',
};

const DEFAULT_LINES_SHOWN = 3;
const SettingsCardDao: React.FC<{daoDetails: DaoDetails}> = ({daoDetails}) => {
  const {t} = useTranslation();
  const {network, isL2Network} = useNetwork();

  const summaryRef = useRef<HTMLParagraphElement>(null);

  const [showAll, setShowAll] = useState(true);
  const [shouldClamp, setShouldClamp] = useState(false);

  const explorerLink =
    CHAIN_METADATA[network].explorer + 'address/' + daoDetails.address;

  const chainLabel = CHAIN_METADATA[network].name;
  const resourceLinksIncluded = daoDetails.metadata.links.length !== 0;

  // this should be extracted into a hook if clamping/showing elsewhere
  useEffect(() => {
    function countNumberOfLines() {
      const descriptionEl = summaryRef.current;

      if (!descriptionEl) {
        return;
      }

      const numberOfLines =
        descriptionEl.offsetHeight /
        parseFloat(getComputedStyle(descriptionEl).lineHeight);

      setShouldClamp(numberOfLines > DEFAULT_LINES_SHOWN);
      setShowAll(numberOfLines <= DEFAULT_LINES_SHOWN);
    }

    countNumberOfLines();
    window.addEventListener('resize', countNumberOfLines);

    return () => {
      window.removeEventListener('resize', countNumberOfLines);
    };
  }, []);

  return (
    <SettingsCard title={t('labels.review.daoMetadata')}>
      <DescriptionPair>
        <Term>{t('labels.daoName')}</Term>
        <Definition>
          <div className="flex items-center space-x-3 xl:space-x-4">
            <p className="ft-text-base xl:font-semibold">
              {daoDetails.metadata.name}
            </p>
            <AvatarDao
              size="small"
              daoName={daoDetails.metadata.name}
              src={daoDetails.metadata.avatar}
            />
          </div>
        </Definition>
      </DescriptionPair>

      <DescriptionPair>
        <Term>{t('labels.review.blockchain')}</Term>
        <Definition>
          <div className="flex flex-1 flex-wrap justify-between gap-y-2">
            <p className="shrink-0 ft-text-base xl:font-semibold">
              {chainLabel}
            </p>
            <Tag label={t('labels.notChangeable')} variant="neutral" />
          </div>
        </Definition>
      </DescriptionPair>

      <DescriptionPair>
        <Term>
          {isL2Network ? t('settings.dao.contractAddress') : t('labels.ens')}
        </Term>
        <Definition>
          <div className="flex flex-1 flex-wrap items-start justify-between gap-y-2">
            <Link
              {...(isL2Network
                ? {label: shortenAddress(daoDetails.address)}
                : {
                    label: toDisplayEns(daoDetails.ensDomain),
                    description: shortenAddress(daoDetails.address),
                  })}
              type="primary"
              className="shrink-0"
              href={explorerLink}
              iconRight={IconType.LINK_EXTERNAL}
            />
            <Tag label={t('labels.notChangeable')} variant="neutral" />
          </div>
        </Definition>
      </DescriptionPair>

      <DescriptionPair className={resourceLinksIncluded ? '' : 'border-none'}>
        <Term>{t('labels.summary')}</Term>
        <Definition className="flex flex-col gap-y-2">
          <Summary ref={summaryRef} {...{fullDescription: showAll}}>
            {daoDetails.metadata.description}
          </Summary>
          {shouldClamp && (
            <Link
              {...(showAll
                ? {
                    label: t('settings.dao.summaryToggleClose'),
                    iconRight: IconType.CHEVRON_DOWN,
                  }
                : {
                    label: t('settings.dao.summaryToggleMore'),
                    iconRight: IconType.CHEVRON_DOWN,
                  })}
              className="ft-text-base"
              onClick={() => setShowAll(prevState => !prevState)}
            />
          )}
        </Definition>
      </DescriptionPair>

      {resourceLinksIncluded && (
        <DescriptionPair className="border-none">
          <Term>{t('labels.links')}</Term>
          <Definition>
            <div className="relative flex flex-col space-y-3">
              {daoDetails.metadata.links.slice(0, 3).map(({name, url}) => (
                <Link
                  key={url}
                  label={name}
                  description={url}
                  type="primary"
                  href={url}
                  iconRight={IconType.LINK_EXTERNAL}
                />
              ))}
              {daoDetails.metadata.links.length > 3 && (
                <Dropdown.Container
                  customTrigger={
                    <Link
                      label={t('settings.dao.links.allLinks')}
                      type="primary"
                      iconRight={IconType.CHEVRON_DOWN}
                    />
                  }
                >
                  {daoDetails.metadata.links.map(({name, url}) => (
                    <Dropdown.Item key={name}>
                      <Link
                        label={name}
                        description={url}
                        type="primary"
                        href={url}
                        iconRight={IconType.LINK_EXTERNAL}
                      />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Container>
              )}
            </div>
          </Definition>
        </DescriptionPair>
      )}
    </SettingsCard>
  );
};

export interface IPluginSettings {
  daoDetails: DaoDetails | undefined | null;
}

const PluginSettingsWrapper: React.FC<IPluginSettings> = ({daoDetails}) => {
  // TODO: Create support for multiple plugin DAO once design is ready.
  const pluginType = daoDetails?.plugins?.[0]?.id as PluginTypes;

  switch (pluginType) {
    case 'token-voting.plugin.echo77.eth':
      return <MajorityVotingSettings daoDetails={daoDetails} />;

    case 'multisig.plugin.echo77.eth':
      return <MultisigSettings daoDetails={daoDetails} />;

    case GaslessPluginName:
      return (
        <>
          <MajorityVotingSettings daoDetails={daoDetails} />
          <GaslessVotingSettings daoDetails={daoDetails} />
        </>
      );

    default:
      // TODO: need to be designed
      return <div>Unsupported Plugin</div>;
  }
};

const SettingsWrapper: React.FC<{children: ReactNode}> = ({children}) => {
  const {t} = useTranslation();
  const {isMobile} = useScreen();

  const {dao} = useParams();
  const {network} = useNetwork();
  const navigate = useNavigate();

  return (
    <PageWrapper
      title={t('labels.daoSettings')}
      primaryBtnProps={{
        label: t('settings.edit'),
        iconLeft: isMobile ? <Icon icon={IconType.APP_PROPOSALS} /> : undefined,
        onClick: () => navigate(generatePath(EditSettings, {network, dao})),
      }}
      customBody={<>{children}</>}
    />
  );
};

export const Layout = styled.div.attrs({
  className:
    'col-span-full xl:col-start-4 xl:col-end-10 text-neutral-600 xl:mt-4',
})``;

type DescriptionProps = {
  fullDescription?: boolean;
};

const Summary = styled.p.attrs({
  className: 'font-normal text-neutral-600 ft-text-base',
})<DescriptionProps>`
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: ${props =>
    props.fullDescription ? 'unset' : DEFAULT_LINES_SHOWN};
`;
