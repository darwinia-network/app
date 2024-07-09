import React, {useEffect, useState} from 'react';
import {
  Controller,
  useFormContext,
  useFormState,
  useWatch,
} from 'react-hook-form';
import {ApplyUpdateParams, VersionTag} from '@aragon/sdk-client-common';
import {useEditor} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {useTranslation} from 'react-i18next';
import {useNavigate} from 'react-router-dom';
import styled from 'styled-components';
import {Markdown} from 'tiptap-markdown';
import {AlertInline} from '@aragon/ods';

import {Loading} from 'components/temporary';
import {UpdateListItem} from 'containers/updateListItem/updateListItem';
import {VersionSelectionMenu} from 'containers/versionSelectionMenu/versionSelectionMenu';
import {useUpdateContext} from 'context/update';
import {useDaoDetailsQuery} from 'hooks/useDaoDetails';
import {useProtocolVersion} from 'services/aragon-sdk/queries/use-protocol-version';
import {useReleaseNotes} from 'services/aragon-sdk/queries/use-release-notes';
import {osxUpdates} from 'utils/osxUpdates';
import {NotFound} from 'utils/paths';

type ModalState = {
  type: 'os' | 'plugin' | 'none';
  isOpen: boolean;
};

export const DefineUpdateProposal: React.FC = () => {
  const [showModal, setShowModal] = useState<ModalState>({
    type: 'none',
    isOpen: false,
  });

  // hooks
  const {t} = useTranslation();
  const navigate = useNavigate();

  const {
    handlePreparePlugin,
    availableOSxVersions: availableProtocolUpdates,
    availablePluginVersions: availablePluginUpdates,
  } = useUpdateContext();

  // data fetching
  const {data: dao, isLoading: detailsLoading} = useDaoDetailsQuery();
  const daoAddress = dao?.address as string;
  const pluginUpdateTypeLabel =
    dao?.plugins[0].id === 'token-voting.plugin.echo77.eth'
      ? 'Token voting'
      : 'Multisig';

  const {data: releases, isLoading: releaseNotesLoading} = useReleaseNotes();
  const {data: protocolVersion, isLoading: protocolVersionLoading} =
    useProtocolVersion(daoAddress);

  // form values
  const editor = useEditor({extensions: [StarterKit, Markdown]});

  const {control, setValue} = useFormContext();
  const {touchedFields} = useFormState({control});

  const pluginSelectedVersion = useWatch({
    name: 'pluginSelectedVersion',
  });
  const osSelectedVersion = useWatch({
    name: 'osSelectedVersion',
  });
  const updateFramework = useWatch({
    name: 'updateFramework',
  });

  // intermediate values
  const multipleOSxUpdates = (availableProtocolUpdates?.size || 0) > 1;
  const multiplePluginUpdates = (availablePluginUpdates?.size || 0) > 1;

  const OSxReleaseNotes = osxUpdates.getReleaseNotes({
    releases,
    version: osSelectedVersion?.version,
  });

  const pluginReleaseNotes = osxUpdates.getReleaseNotes({
    releases,
    version: pluginSelectedVersion?.version,
    isPlugin: true,
  });

  const isLatestOSxVersion = !!availableProtocolUpdates?.get(
    osSelectedVersion?.version ?? ''
  )?.isLatest;

  const isLatestPlugin = !!availablePluginUpdates?.get(
    osxUpdates.getPluginVersion(pluginSelectedVersion?.version) ?? ''
  )?.isLatest;

  const isPluginPrepared = availablePluginUpdates?.get(
    osxUpdates.getPluginVersion(pluginSelectedVersion?.version) ?? ''
  )?.isPrepared;

  const updateListItems = [
    {
      id: 'os',
      label: osxUpdates.getProtocolUpdateLabel(osSelectedVersion?.version),
      releaseNote: OSxReleaseNotes,
      linkLabel: t('update.item.releaseNotesLabel'),
      ...(isLatestOSxVersion && {
        tagLabelNatural: t('update.item.tagLatest'),
      }),
      ...(multipleOSxUpdates && {
        buttonSecondaryLabel: t('update.item.versionCtaLabel'),
        onClickActionSecondary: (e: React.MouseEvent) => {
          setShowModal({
            isOpen: true,
            type: 'os',
          });
          e?.stopPropagation();
        },
      }),
      disabled: availableProtocolUpdates?.size === 0,
    },
    {
      id: 'plugin',
      releaseNote: pluginReleaseNotes,
      label: osxUpdates.getPluginUpdateLabel(
        pluginSelectedVersion?.version,
        pluginUpdateTypeLabel
      ),
      linkLabel: t('update.item.releaseNotesLabel'),
      ...(isLatestPlugin && {tagLabelNatural: t('update.item.tagLatest')}),
      ...(isPluginPrepared
        ? {tagLabelInfo: t('update.item.tagPrepared')}
        : {
            buttonPrimaryLabel: t('update.item.prepareCtaLabel'),
            onClickActionPrimary: (e: React.MouseEvent) => e?.stopPropagation(),
          }),

      ...(multiplePluginUpdates && {
        buttonSecondaryLabel: t('update.item.versionCtaLabel'),
        onClickActionSecondary: (e: React.MouseEvent) => {
          setShowModal({
            isOpen: true,
            type: 'plugin',
          });
          e?.stopPropagation();
        },
      }),
      disabled: availablePluginUpdates?.size === 0,
    },
  ].filter(update => !update.disabled);

  // queries loading
  const isLoading =
    detailsLoading ||
    protocolVersionLoading ||
    releaseNotesLoading ||
    ((availablePluginUpdates?.size ?? 1) > 0 && !pluginReleaseNotes) ||
    ((availableProtocolUpdates?.size ?? 1) > 0 && !OSxReleaseNotes);

  /*************************************************
   *                    Effects                    *
   *************************************************/
  // Add proposal title and summary
  useEffect(() => {
    const proposalTitle = t('update.proposal.title');
    const proposalSummary = t('update.proposal.summary', {
      daoName: dao?.metadata.name,
    });

    setValue('proposalTitle', proposalTitle);
    setValue('proposalSummary', proposalSummary);
  }, [dao?.metadata.name, setValue, t]);

  // Add proposal body
  useEffect(() => {
    let proposalBody = t('update.proposal.descriptionHeader');

    if (updateFramework?.os) {
      const updatedVersion = osxUpdates.getProtocolUpdateLabel(
        osSelectedVersion?.version
      );
      const releaseNotes = osxUpdates.getReleaseNotes({
        releases,
        version: osSelectedVersion?.version,
      });
      editor?.commands.setContent(releaseNotes?.summary ?? '');
      proposalBody += t('update.proposal.descriptionProtocolUpgrade', {
        updatedVersion,
        description: editor?.getHTML().replace(/<(\/){0,1}p>/g, ''),
        releaseNotesLink: releaseNotes?.html_url,
        currentVersion: osxUpdates.getProtocolUpdateLabel(protocolVersion),
      });
    }
    if (updateFramework?.plugin) {
      const updatedVersion = osxUpdates.getPluginUpdateLabel(
        pluginSelectedVersion?.version,
        pluginUpdateTypeLabel
      );
      const releaseNotes = osxUpdates.getReleaseNotes({
        releases,
        version: pluginSelectedVersion?.version,
        isPlugin: true,
      });
      editor?.commands.setContent(releaseNotes?.summary ?? '');
      proposalBody += t('update.proposal.descriptionPluginUpgrade', {
        updatedVersion,
        description: editor?.getHTML().replace(/<(\/){0,1}p>/g, ''),
        releaseNotesLink: releaseNotes?.html_url,
        currentVersion: osxUpdates.getPluginUpdateLabel(
          dao?.plugins[0],
          pluginUpdateTypeLabel
        ),
      });
    }

    proposalBody += t('update.proposal.descriptionFooter');

    setValue('proposal', proposalBody);
  }, [
    dao?.plugins,
    editor,
    osSelectedVersion?.version,
    pluginSelectedVersion?.version,
    releases,
    setValue,
    t,
    updateFramework.os,
    updateFramework?.plugin,
    protocolVersion,
    pluginUpdateTypeLabel,
  ]);

  // add values to form
  useEffect(() => {
    setValue('actions', []);

    if (updateFramework?.os && osSelectedVersion?.version) {
      setValue(`actions.0.name`, 'os_update');
      setValue(`actions.0.inputs.version`, osSelectedVersion?.version);
    }

    if (updateFramework?.plugin && pluginSelectedVersion?.version) {
      const versionKey = `${pluginSelectedVersion.version.release}.${pluginSelectedVersion.version.build}`;

      const preparedData: ApplyUpdateParams | undefined =
        availablePluginUpdates?.get(versionKey)?.preparedData;

      const inputs: VersionTag | ApplyUpdateParams = preparedData
        ? {
            versionTag: preparedData.versionTag,
            initData: new Uint8Array([]),
            pluginAddress: preparedData.pluginAddress,
            permissions: preparedData.permissions,
            helpers: preparedData.helpers,

            // TODO: This return type is incorrect!
            pluginRepo:
              typeof preparedData.pluginRepo === 'string'
                ? preparedData.pluginRepo
                : (
                    preparedData.pluginRepo as unknown as {
                      id: string;
                      subdomain: string;
                    }
                  ).id,
          }
        : pluginSelectedVersion.version;
      setValue(`actions.1.name`, 'plugin_update');
      setValue(`actions.1.inputs`, inputs);
    }
  }, [
    availablePluginUpdates,
    osSelectedVersion?.version,
    pluginSelectedVersion?.version,
    pluginSelectedVersion?.isPrepared,
    setValue,
    updateFramework?.os,
    updateFramework?.plugin,
  ]);

  // auto select the available updates by default if only one
  // update is present in a "framework"
  useEffect(() => {
    if (!touchedFields.updateFramework?.plugin) {
      if (availablePluginUpdates?.size === 1) {
        setValue('updateFramework.plugin', true, {shouldTouch: true});
      }
    }
  }, [
    availablePluginUpdates?.size,
    setValue,
    touchedFields.updateFramework?.plugin,
  ]);

  useEffect(() => {
    if (!touchedFields.updateFramework?.os) {
      if (availableProtocolUpdates?.size === 1) {
        setValue('updateFramework.os', true, {shouldTouch: true});
      }
    }
  }, [
    availableProtocolUpdates?.size,
    setValue,
    touchedFields.updateFramework?.os,
  ]);

  /*************************************************
   *                     Render                    *
   *************************************************/
  if (isLoading) {
    return <Loading />;
  }

  // no protocol or plugin update
  if (
    availablePluginUpdates?.size === 0 &&
    availableProtocolUpdates?.size === 0
  ) {
    navigate(NotFound, {
      replace: true,
    });
  }

  return (
    <UpdateContainer>
      <UpdateGroupWrapper>
        <Controller
          name="updateFramework"
          rules={{required: 'Validate'}}
          control={control}
          render={({field: {onChange, value}}) => (
            <>
              {updateListItems.map(data => (
                <UpdateListItem
                  key={data.label}
                  {...data}
                  type={value?.[data.id] ? 'active' : 'default'}
                  multiSelect
                  onClick={() => {
                    onChange({
                      ...value,
                      [data.id]: !value?.[data.id],
                    });
                  }}
                  onClickActionPrimary={(e: React.MouseEvent) => {
                    e?.stopPropagation();
                    handlePreparePlugin(data.id);
                  }}
                />
              ))}
            </>
          )}
        />
      </UpdateGroupWrapper>
      <VersionSelectionMenu
        showModal={showModal}
        handleCloseMenu={() => {
          setShowModal({
            isOpen: false,
            type: 'none',
          });
        }}
      />
      <AlertInline message={t('update.itemList.alertInfo')} variant="info" />
    </UpdateContainer>
  );
};

const UpdateGroupWrapper = styled.div.attrs({
  className: 'flex flex-col items-center md:justify-center gap-y-3',
})``;

const UpdateContainer = styled.div.attrs({
  className: 'space-y-4',
})``;
